import { useCallback, useEffect, useRef, useState } from 'react';

type SendAudio = (data: string) => void;

function base64FromBytes(bytes: Uint8Array): string {
  let binary = '';
  const stride = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += stride) binary += String.fromCharCode(...bytes.subarray(offset, offset + stride));
  return btoa(binary);
}

function pcm16Base64(samples: Float32Array): string {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(index * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  });
  return base64FromBytes(bytes);
}

function resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const length = Math.max(1, Math.round(input.length * toRate / fromRate));
  const output = new Float32Array(length);
  const ratio = fromRate / toRate;
  for (let i = 0; i < length; i += 1) {
    const position = i * ratio;
    const left = Math.floor(position);
    const fraction = position - left;
    const a = input[Math.min(left, input.length - 1)] ?? 0;
    const b = input[Math.min(left + 1, input.length - 1)] ?? a;
    output[i] = a + (b - a) * fraction;
  }
  return output;
}

export function useAudio(sendAudio: SendAudio, onVoiceStart: () => void, onVoiceStop: () => void) {
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sendRef = useRef(sendAudio);
  const startCallbackRef = useRef(onVoiceStart);
  const stopCallbackRef = useRef(onVoiceStop);
  const playbackAtRef = useRef(0);
  const playbackSourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const generationRef = useRef(0);
  const startingRef = useRef(false);
  const mountedRef = useRef(false);
  const announcedRef = useRef(false);

  useEffect(() => { sendRef.current = sendAudio; }, [sendAudio]);
  useEffect(() => { startCallbackRef.current = onVoiceStart; stopCallbackRef.current = onVoiceStop; }, [onVoiceStart, onVoiceStop]);

  const clearPlayback = useCallback(() => {
    for (const source of playbackSourcesRef.current) {
      try { source.stop(); } catch { /* it already ended */ }
      source.disconnect();
    }
    playbackSourcesRef.current.clear();
    playbackAtRef.current = contextRef.current?.currentTime ?? 0;
  }, []);

  const stop = useCallback((notifyServer = true) => {
    generationRef.current += 1;
    startingRef.current = false;
    clearPlayback();
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    void contextRef.current?.close().catch(() => undefined);
    processorRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    contextRef.current = null;
    playbackAtRef.current = 0;
    if (mountedRef.current) {
      setActive(false);
      setStarting(false);
    }
    if (announcedRef.current) {
      announcedRef.current = false;
      if (notifyServer) stopCallbackRef.current();
    }
  }, [clearPlayback]);

  const start = useCallback(async () => {
    if (startingRef.current || streamRef.current || !mountedRef.current) return;
    startingRef.current = true;
    setStarting(true);
    const requestGeneration = ++generationRef.current;
    setError(null);
    let stream: MediaStream | null = null;
    let context: AudioContext | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access is not available in this browser.');
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      if (!mountedRef.current || generationRef.current !== requestGeneration) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (event) => {
        if (generationRef.current !== requestGeneration || !mountedRef.current) return;
        sendRef.current(pcm16Base64(resample(event.inputBuffer.getChannelData(0), context!.sampleRate, 16000)));
      };
      streamRef.current = stream;
      contextRef.current = context;
      sourceRef.current = source;
      processorRef.current = processor;
      source.connect(processor);
      processor.connect(context.destination);
      await context.resume();
      if (!mountedRef.current || generationRef.current !== requestGeneration) return;
      startCallbackRef.current();
      announcedRef.current = true;
      setActive(true);
    } catch (caught) {
      stream?.getTracks().forEach((track) => track.stop());
      if (context && contextRef.current !== context) void context.close().catch(() => undefined);
      if (generationRef.current === requestGeneration && mountedRef.current) {
        const message = caught instanceof DOMException && caught.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Allow access in your browser settings and try again.'
          : caught instanceof Error ? caught.message : 'Microphone could not be started.';
        setError(message);
        stop(false);
      }
    } finally {
      if (generationRef.current === requestGeneration) {
        startingRef.current = false;
        if (mountedRef.current) setStarting(false);
      }
    }
  }, [stop]);

  const play = useCallback((encoded: string) => {
    const context = contextRef.current;
    if (!context || !mountedRef.current) return;
    try {
      const binary = atob(encoded);
      if (binary.length % 2 !== 0) return;
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const view = new DataView(bytes.buffer);
      const samples = new Float32Array(binary.length / 2);
      for (let i = 0; i < samples.length; i += 1) samples[i] = view.getInt16(i * 2, true) / 32768;
      if (!samples.length || samples.length > 24_000 * 30) return;
      const buffer = context.createBuffer(1, samples.length, 24000);
      buffer.copyToChannel(samples, 0);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.onended = () => {
        playbackSourcesRef.current.delete(source);
        source.disconnect();
      };
      const startAt = Math.max(context.currentTime, playbackAtRef.current);
      playbackSourcesRef.current.add(source);
      source.start(startAt);
      playbackAtRef.current = startAt + buffer.duration;
    } catch { /* malformed audio is ignored; it cannot authorize any action */ }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      startingRef.current = false;
      clearPlayback();
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      void contextRef.current?.close().catch(() => undefined);
      processorRef.current = null;
      sourceRef.current = null;
      streamRef.current = null;
      contextRef.current = null;
      playbackAtRef.current = 0;
      announcedRef.current = false;
    };
  }, [clearPlayback]);

  return { active, starting, error, start, stop, play, clearPlayback };
}
