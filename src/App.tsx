import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowDown, AudioLines, Check, CircleAlert, Globe2, LoaderCircle, Mic, MicOff,
  Send, Settings2, ShieldCheck, Square, Wifi, WifiOff, X,
} from 'lucide-react';
import { A2UIOfferSurface } from './a2ui';
import {
  AppointmentCard, EventCard, GovernmentCard, JourneyCard, LeisureCard, ServiceCard,
} from './components/offers';
import { useAudio } from './hooks/useAudio';
import { decodeMessage, parseServerEvent } from './hooks/protocol';
import { ProfileWizard, useLocalProfile } from './profile';
import { emptyProfile, neededProfileFor, type Offer, type Profile, type ServerEvent } from '../shared/schema';
import './styles.css';

type ChatMessage = { id: string; role: 'assistant' | 'user'; text: string; local?: boolean; deliveryUnknown?: boolean };
type CardEntry = { id: string; messages: unknown[]; version: number };
type Approval = Extract<ServerEvent, { type: 'approval' }>;
type ResultView = Extract<ServerEvent, { type: 'result' }>;
type TimelineItem =
  | { kind: 'message'; id: string; message: ChatMessage }
  | { kind: 'cards'; id: string; card: CardEntry }
  | { kind: 'approval'; id: string; approval: Approval }
  | { kind: 'result'; id: string; result: ResultView };
type Connection = 'connecting' | 'connected' | 'disconnected';
type ViewMode = 'chat' | 'website';

const examples = [
  { kind: 'event', label: 'Find an event', prompt: 'Find a test concert' },
  { kind: 'journey', label: 'Plan a journey', prompt: 'Find a test train journey' },
  { kind: 'appointment', label: 'Find an appointment', prompt: 'Find a test doctor appointment' },
  { kind: 'government', label: 'Request a civic office appointment', prompt: 'Find a test civic office appointment' },
  { kind: 'service', label: 'Request a repair service', prompt: 'Request a test repair service' },
  { kind: 'leisure', label: 'Find a community course', prompt: 'Find a test community course' },
] as const;

export default function App() {
  const { profile, completed, storageError, saveProfile, deleteProfile } = useLocalProfile();
  const [editingProfile, setEditingProfile] = useState(!completed);
  const [sessionOnlyAvailable, setSessionOnlyAvailable] = useState(false);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [draft, setDraft] = useState('');
  const [connection, setConnection] = useState<Connection>('connecting');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [serverMode, setServerMode] = useState<'demo' | 'live' | null>(null);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [status, setStatus] = useState<{ text: string; state: string; phase?: string }>({ text: 'Ready when you are.', state: 'idle' });
  const [browser, setBrowser] = useState<Extract<ServerEvent, { type: 'browser' }> | null>(null);
  const [approval, setApproval] = useState<Approval | null>(null);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [pendingSelection, setPendingSelection] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [newContent, setNewContent] = useState(false);
  const [socketRevision, setSocketRevision] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const shouldFollowRef = useRef(true);
  const pendingUserRef = useRef<string[]>([]);
  const currentVersionRef = useRef(0);
  const invalidBeforeRef = useRef(0);
  const usedApprovalRef = useRef(new Set<string>());
  const pendingSelectionRef = useRef(false);
  const taskDispatchRef = useRef(false);
  const currentTaskKindRef = useRef<Offer['kind'] | null>(null);
  const handledVoiceTranscriptIdsRef = useRef(new Set<string>());
  const submitTaskRef = useRef<(text: string) => boolean>(() => false);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const invalidate = useCallback(() => {
    invalidBeforeRef.current = Math.max(invalidBeforeRef.current, currentVersionRef.current + 1);
    setApproval(null);
    setConfirmChecked(false);
  }, []);

  const discardPendingUserMessages = useCallback(() => {
    const pendingIds = new Set(pendingUserRef.current);
    pendingUserRef.current = [];
    if (pendingIds.size === 0) return;
    setTimeline((existing) => existing.map((item) =>
      item.kind === 'message' && pendingIds.has(item.id)
        ? { ...item, message: { ...item.message, local: false, deliveryUnknown: true } }
        : item));
  }, []);

  useEffect(() => {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${location.host}/ws`);
    socketRef.current = socket;
    setConnection('connecting');
    socket.onopen = () => {
      if (socketRef.current !== socket) return;
      setConnection('connected');
      setConnectionError(null);
      taskDispatchRef.current = false;
      handledVoiceTranscriptIdsRef.current.clear();
      pendingSelectionRef.current = false;
      setPendingSelection(false);
      setSocketRevision((revision) => revision + 1);
    };
    socket.onmessage = (message) => {
      if (socketRef.current !== socket) return;
      let raw: unknown;
      try { raw = decodeMessage(message.data); }
      catch (error) { setConnectionError(error instanceof Error ? error.message : 'The server sent an unreadable message.'); return; }
      const event = parseServerEvent(raw);
      if (!event) { setConnectionError('A server update did not match the current app contract and was ignored.'); return; }
      handleEvent(event);
    };
    socket.onerror = () => {
      if (socketRef.current === socket) setConnectionError('The local assistant connection failed. Check that the app server is running.');
    };
    socket.onclose = () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
        setConnection('disconnected');
        setConnectionError('Connection closed. Reopen the app after the local assistant is available.');
        taskDispatchRef.current = false;
        discardPendingUserMessages();
        invalidate();
        pendingSelectionRef.current = false;
        setPendingSelection(false);
        audio.stop(false);
      }
    };
    function handleEvent(event: ServerEvent) {
      const versionedActiveEvent =
        event.type === 'cards' || event.type === 'approval' || event.type === 'status';
      if (
        versionedActiveEvent &&
        'version' in event &&
        event.version !== undefined &&
        (event.version < invalidBeforeRef.current || event.version < currentVersionRef.current)
      ) return;
      if (
        versionedActiveEvent &&
        'version' in event &&
        event.version !== undefined &&
        event.version > currentVersionRef.current
      ) {
        currentVersionRef.current = event.version;
        setApproval((current) => current && current.version < event.version ? null : current);
        setConfirmChecked(false);
      }
      if (event.type === 'ready') {
        setServerMode(event.mode);
        setVoiceAvailable(event.voiceAvailable);
      } else if (event.type === 'message') {
        const pending = event.role === 'user' ? pendingUserRef.current.shift() : undefined;
        setTimeline((existing) => {
          if (pending) return existing.map((item) => item.kind === 'message' && item.id === pending
            ? { kind: 'message', id: event.id, message: { ...event, local: false } }
            : item);
          if (event.role === 'user') {
            const uncertain = [...existing].reverse().find((item) =>
              item.kind === 'message'
              && item.message.role === 'user'
              && item.message.deliveryUnknown
              && item.message.text === event.text);
            if (uncertain) return existing.map((item) => item.id === uncertain.id
              ? { kind: 'message', id: event.id, message: { ...event, local: false } }
              : item);
          }
          if (existing.some((item) => item.id === event.id)) return existing;
          return [...existing, { kind: 'message', id: event.id, message: event }];
        });
      } else if (event.type === 'cards') {
        currentVersionRef.current = Math.max(currentVersionRef.current, event.version);
        const card = { id: event.id, messages: event.messages, version: event.version };
        setTimeline((existing) => existing.some((item) => item.kind === 'cards' && item.id === event.id)
          ? existing.map((item) => item.kind === 'cards' && item.id === event.id ? { kind: 'cards', id: event.id, card } : item)
          : [...existing, { kind: 'cards', id: event.id, card }]);
        setApproval(null);
      } else if (event.type === 'status') {
        currentVersionRef.current = Math.max(currentVersionRef.current, event.version);
        taskDispatchRef.current = event.state === 'working';
        setStatus(event);
        if (event.phase) {
          const requestKind = currentTaskKindRef.current === 'government'
            || currentTaskKindRef.current === 'service'
            || currentTaskKindRef.current === 'leisure';
          const message = {
            id: `phase-${event.version}-${event.phase}-${Date.now()}`,
            role: 'assistant' as const,
            text: phaseText(event.phase, requestKind),
          };
          setTimeline((existing) => [...existing, { kind: 'message', id: message.id, message }]);
        }
      } else if (event.type === 'browser') {
        setBrowser(event);
      } else if (event.type === 'approval') {
        currentVersionRef.current = Math.max(currentVersionRef.current, event.version);
        if (event.version < invalidBeforeRef.current || event.expiresAt <= Date.now() || usedApprovalRef.current.has(event.token)) return;
        setApproval(event);
        taskDispatchRef.current = false;
        pendingSelectionRef.current = false;
        setPendingSelection(false);
        setTimeline((existing) => [...existing, { kind: 'approval', id: event.id, approval: event }]);
        setConfirmChecked(false);
        setStatus({ text: 'Review the details before confirming.', state: 'waiting', phase: 'prepared' });
      } else if (event.type === 'result') {
        setTimeline((existing) => existing.some(
          (item) => item.kind === 'result' && item.id === event.id,
        ) ? existing : [...existing, { kind: 'result', id: event.id, result: event }]);
        const mayUpdateActive =
          event.version === undefined ||
          (event.version === currentVersionRef.current &&
            event.version >= invalidBeforeRef.current);
        if (!mayUpdateActive) return;
        if (event.kind !== undefined) currentTaskKindRef.current = event.kind;
        setApproval(null);
        taskDispatchRef.current = false;
        setConfirmChecked(false);
        setStatus({
          text: event.outcome === 'request_received'
            ? 'The test request was received. This does not confirm a real appointment, service, or enrollment.'
            : event.state === 'confirmed'
              ? 'The test action is confirmed.'
              : 'The action result is unclear. Do not retry it yet.',
          state: 'complete',
          phase: event.state,
        });
      } else if (event.type === 'error') {
        taskDispatchRef.current = false;
        discardPendingUserMessages();
        pendingSelectionRef.current = false;
        setPendingSelection(false);
        const message = { id: `error-${Date.now()}`, role: 'assistant' as const, text: event.message };
        setTimeline((existing) => [...existing, { kind: 'message', id: message.id, message }]);
      } else if (event.type === 'voice') {
        if (event.state === 'interrupted') {
          audio.clearPlayback();
          setStatus((current) => ({ ...current, text: 'Assistant audio was interrupted. The microphone is still on.' }));
        } else {
          setStatus((current) => ({ ...current, text: event.state === 'connected' ? 'Microphone is on. Speak when ready.' : 'Microphone is off.' }));
        }
        if (event.state === 'closed') audio.stop(false);
      } else if (event.type === 'audio') {
        audio.play(event.data);
      } else if (event.type === 'transcript' && event.final && event.text.trim()) {
        if (event.role === 'user') {
          if (typeof event.id !== 'string') {
            const message = {
              id: `voice-missing-id-${Date.now()}`,
              role: 'assistant' as const,
              text: 'This voice turn could not be submitted because its turn ID was missing. Please try again.',
            };
            setTimeline((existing) => [...existing, { kind: 'message', id: message.id, message }]);
            return;
          }
          const key = `user:${event.id}`;
          if (handledVoiceTranscriptIdsRef.current.has(key)) return;
          handledVoiceTranscriptIdsRef.current.add(key);
          const text = event.text.trim();
          if (!submitTaskRef.current(text)) {
            const message = {
              id: `voice-busy-${typeof event.id === 'string' ? event.id : Date.now()}`,
              role: 'assistant' as const,
              text: 'I heard your request, but it could not be submitted. Please try again.',
            };
            setTimeline((existing) => [...existing, { kind: 'message', id: message.id, message }]);
          }
        } else {
          if (typeof event.id === 'string') {
            const key = `assistant:${event.id}`;
            if (handledVoiceTranscriptIdsRef.current.has(key)) return;
            handledVoiceTranscriptIdsRef.current.add(key);
          }
          const message = {
            id: typeof event.id === 'string' ? `transcript-${event.id}` : `transcript-${Date.now()}-${Math.random()}`,
            role: 'assistant' as const,
            text: event.text,
          };
          setTimeline((existing) => [...existing, { kind: 'message', id: message.id, message }]);
        }
      }
    }
    return () => {
      socketRef.current = null;
      socket.close();
      audio.stop(false);
    };
    // The socket is created once per mount. Audio callbacks read current refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendRaw = useCallback((payload: object) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setConnectionError('The assistant is disconnected. Your message was not sent.');
      return false;
    }
    socket.send(JSON.stringify(payload));
    return true;
  }, []);

  const sendAudio = useCallback((data: string) => { sendRaw({ type: 'audio', data }); }, [sendRaw]);
  const sendVoiceStart = useCallback(() => { sendRaw({ type: 'voice_start' }); }, [sendRaw]);
  const sendVoiceStop = useCallback(() => { sendRaw({ type: 'voice_stop' }); }, [sendRaw]);
  const audio = useAudio(sendAudio, sendVoiceStart, sendVoiceStop);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (shouldFollowRef.current) {
      list.scrollTop = list.scrollHeight;
      setNewContent(false);
    } else {
      setNewContent(true);
    }
  }, [timeline, approval]);

  useEffect(() => {
    if (!approval) return;
    const timer = window.setInterval(() => {
      if (approval.expiresAt <= Date.now()) {
        setApproval(null);
        setConfirmChecked(false);
        setStatus({ text: 'This review expired. Select the option again to prepare a new review.', state: 'idle' });
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [approval]);

  const profileFor = useCallback((kind: Offer['kind']): Profile => neededProfileFor(kind, profileRef.current), []);

  const submitTask = useCallback((text: string) => {
    const clean = text.trim();
    if (!clean || clean.length > 6000) return false;
    if (taskDispatchRef.current || pendingSelectionRef.current) return false;
    const sample = examples.find((item) => item.prompt === clean);
    const category = sample?.kind ?? kindHint(clean);
    const projected = category ? profileFor(category) : emptyProfile;
    const localId = `local-user-${Date.now()}-${Math.random()}`;
    if (!sendRaw({ type: 'task', text: clean, profile: projected })) return false;
    taskDispatchRef.current = true;
    currentTaskKindRef.current = category;
    invalidate();
    pendingUserRef.current.push(localId);
    const message = { id: localId, role: 'user' as const, text: clean, local: true };
    setTimeline((existing) => [...existing, { kind: 'message', id: localId, message }]);
    setDraft('');
    pendingSelectionRef.current = false;
    setPendingSelection(false);
    setStatus({ text: 'Working on your request…', state: 'working' });
    setViewMode('chat');
    shouldFollowRef.current = true;
    return true;
  }, [invalidate, profileFor, sendRaw]);
  submitTaskRef.current = submitTask;

  const selectOffer = useCallback((offerId: string, version: number, kind: Offer['kind']) => {
    if (pendingSelectionRef.current || approval || version < invalidBeforeRef.current || version !== currentVersionRef.current) return;
    pendingSelectionRef.current = true;
    setPendingSelection(true);
    setApproval(null);
    setConfirmChecked(false);
    if (!sendRaw({
      type: 'select',
      offerId,
      version,
      profile: neededProfileFor(kind, profileRef.current),
    })) {
      pendingSelectionRef.current = false;
      setPendingSelection(false);
      return;
    }
    currentTaskKindRef.current = kind;
    taskDispatchRef.current = true;
    setStatus({ text: 'Preparing a review for this option…', state: 'working' });
  }, [approval, sendRaw]);

  const stopWork = useCallback(() => {
    invalidate();
    taskDispatchRef.current = false;
    discardPendingUserMessages();
    pendingSelectionRef.current = false;
    setPendingSelection(false);
    sendRaw({ type: 'stop' });
    setStatus({ text: 'Stopping browser work…', state: 'paused' });
  }, [discardPendingUserMessages, invalidate, sendRaw]);

  const reset = useCallback(() => {
    invalidate();
    taskDispatchRef.current = false;
    discardPendingUserMessages();
    pendingSelectionRef.current = false;
    setPendingSelection(false);
    sendRaw({ type: 'reset' });
    setBrowser(null);
    audio.stop();
    setStatus({ text: 'Ready when you are.', state: 'idle' });
  }, [discardPendingUserMessages, invalidate, sendRaw]);

  const confirmBooking = useCallback(() => {
    if (!approval || !confirmChecked || approval.expiresAt <= Date.now() || usedApprovalRef.current.has(approval.token)) return;
    if (approval.version !== currentVersionRef.current || approval.version < invalidBeforeRef.current) {
      setApproval(null);
      setStatus({ text: 'This review is out of date. Select the option again.', state: 'idle' });
      return;
    }
    usedApprovalRef.current.add(approval.token);
    taskDispatchRef.current = true;
    const profileSubset = profileFor(approval.offer.kind);
    setApproval(null);
    setStatus({ text: 'Submitting the approved test action…', state: 'working', phase: 'submitted' });
    if (!sendRaw({ type: 'confirm', token: approval.token, version: approval.version, profile: profileSubset })) {
      taskDispatchRef.current = false;
      setStatus({ text: 'Connection lost before the result was received. Check the test provider state before taking another action.', state: 'paused', phase: 'unclear' });
    }
  }, [approval, confirmChecked, profileFor, sendRaw]);

  const saveProfileChange = useCallback((next: Profile) => {
    const saved = saveProfile(next);
    // Save may return false when storage is blocked, but the in-memory profile
    // has still changed; clear prior authorization and notify the live session.
    invalidate();
    pendingSelectionRef.current = false;
    setPendingSelection(false);
    taskDispatchRef.current = false;
    discardPendingUserMessages();
    sendRaw({ type: 'profile_changed' });
    setSessionOnlyAvailable(!saved);
    if (saved) setEditingProfile(false);
    return saved;
  }, [discardPendingUserMessages, invalidate, saveProfile, sendRaw]);

  const useProfileForSession = useCallback(() => {
    if (!sessionOnlyAvailable) return;
    invalidate();
    pendingSelectionRef.current = false;
    setPendingSelection(false);
    taskDispatchRef.current = false;
    discardPendingUserMessages();
    sendRaw({ type: 'profile_changed' });
    setSessionOnlyAvailable(false);
    setEditingProfile(false);
  }, [discardPendingUserMessages, invalidate, sendRaw, sessionOnlyAvailable]);

  const deleteSavedProfile = useCallback(() => {
    if (!window.confirm('Delete the profile saved in this browser?')) return;
    if (!deleteProfile()) return;
    invalidate();
    taskDispatchRef.current = false;
    discardPendingUserMessages();
    pendingSelectionRef.current = false;
    setPendingSelection(false);
    sendRaw({ type: 'profile_changed' });
  }, [deleteProfile, discardPendingUserMessages, invalidate, sendRaw]);

  const toggleMic = () => {
    if (audio.active || audio.starting) audio.stop();
    else if (voiceAvailable) void audio.start();
    else setConnectionError('Live voice is not available in this session. You can still use text.');
  };

  const scrollToLatest = () => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    shouldFollowRef.current = true;
    setNewContent(false);
  };

  const connectionLabel = connection === 'connected' ? `${serverMode === 'demo' ? 'Test server' : serverMode === 'live' ? 'Assistant connected' : 'Connected'}` : connection === 'connecting' ? 'Connecting' : 'Disconnected';
  const browserUrl = browser?.url;
  const browserHost = useMemo(() => {
    if (!browserUrl) return null;
    try { return new URL(browserUrl).host; } catch { return browserUrl; }
  }, [browserUrl]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#main" aria-label="Everyday Assistant home">
          <span className="brand-mark" aria-hidden="true">e</span>
          <span>Everyday Assistant</span>
        </a>
        <div className="topbar-actions">
          <span className={`connection-pill connection-pill--${connection}`} aria-live="polite">
            {connection === 'connected' ? <Wifi size={18} aria-hidden="true" /> : connection === 'connecting' ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <WifiOff size={18} aria-hidden="true" />}
            {connectionLabel}
          </span>
          <button className="icon-label-button profile-button" type="button" aria-label="Your details" onClick={() => setEditingProfile(true)}>
            <Settings2 size={20} aria-hidden="true" /><span>Your details</span>
          </button>
          <div className="mobile-view-switch" role="group" aria-label="Choose view">
            <button type="button" aria-pressed={viewMode === 'chat'} onClick={() => setViewMode('chat')}>Chat</button>
            <button type="button" aria-pressed={viewMode === 'website'} onClick={() => setViewMode('website')}>Website</button>
          </div>
          <button className="icon-label-button reset-button" type="button" aria-label="New task" onClick={reset}>
            <X size={20} aria-hidden="true" /><span>New task</span>
          </button>
        </div>
      </header>

      {(connectionError || storageError || audio.error) && (
        <div className="alert-banner" role="status">
          <CircleAlert size={20} aria-hidden="true" />
          <span>{connectionError || audio.error || storageError}</span>
          {connectionError && <button type="button" aria-label="Dismiss connection message" onClick={() => setConnectionError(null)}><X size={18} /></button>}
        </div>
      )}

      <div id="main" className={`workspace ${viewMode === 'website' ? 'workspace--website-focus' : ''}`}>
        <section className={`chat-panel ${viewMode === 'website' ? 'mobile-hidden' : ''}`} aria-label="Conversation">
          <div className="conversation-heading">
            <div>
              <p className="overline">YOUR HELPFUL ASSISTANT</p>
              <h1>What can I help you with?</h1>
            </div>
            <div className="working-indicator" aria-live="polite">
              {status.state === 'working' && <LoaderCircle className="spin" size={19} aria-hidden="true" />}
              <span>{status.text}</span>
            </div>
          </div>

          <div className="conversation-scroll" ref={listRef} onScroll={(event) => {
            const el = event.currentTarget;
            shouldFollowRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
            if (shouldFollowRef.current) setNewContent(false);
          }} aria-live="off">
            {timeline.length === 0 && (
              <div className="welcome-content">
                <div className="assistant-intro">
                  <span className="assistant-avatar" aria-hidden="true">e</span>
                  <p>I can help find events, plan journeys, arrange appointments, and prepare test requests for civic services, home services, and community courses. I’ll show you what I find and ask before any test action.</p>
                </div>
                <div className="example-grid" aria-label="Try an example">
                  {examples.map((example) => (
                      <button className="example-card" key={example.kind} type="button" disabled={status.state === 'working' || taskDispatchRef.current} onClick={() => submitTask(example.prompt)}>
                      <span>{example.label}</span><span className="example-arrow" aria-hidden="true">↗</span>
                      <small>{example.prompt}</small>
                    </button>
                  ))}
                </div>
                <p className="privacy-note"><ShieldCheck size={18} aria-hidden="true" /> Your profile is stored in this browser. The assistant processes your request to help find options; you’ll review any details shared with a test website before confirming.</p>
              </div>
            )}
            {timeline.map((item) => {
              if (item.kind === 'message') return <MessageBubble key={item.id} message={item.message} />;
              if (item.kind === 'cards') return <div className="a2ui-card" key={item.id} aria-label="Available option">
                <A2UIOfferSurface
                  messages={item.card.messages}
                  version={item.card.version}
                  currentVersion={currentVersionRef.current}
                  disabled={connection !== 'connected' || status.state === 'working' || status.state === 'paused' || status.state === 'complete' || pendingSelection || approval !== null || item.card.version !== currentVersionRef.current || item.card.version < invalidBeforeRef.current}
                  onSelect={(offerId, version, kind) => selectOffer(offerId, version, kind)}
                />
              </div>;
              if (item.kind === 'approval') {
                const live = approval?.token === item.approval.token && approval.version === currentVersionRef.current && approval.expiresAt > Date.now();
                return <ApprovalReview key={item.id} approval={item.approval} checked={live && confirmChecked} setChecked={setConfirmChecked} onConfirm={confirmBooking} disabled={!live || connection !== 'connected'} />;
              }
              return <ResultCard key={item.id} result={item.result} />;
            })}
          </div>
          {newContent && <button className="new-content-button" type="button" onClick={scrollToLatest}><ArrowDown size={18} aria-hidden="true" /> New response</button>}

          <div className="composer-wrap">
            {status.state === 'working' && <button className="stop-button" type="button" onClick={stopWork}><Square size={18} aria-hidden="true" /> Stop</button>}
            <form className="composer" onSubmit={(event) => { event.preventDefault(); submitTask(draft); }}>
              <label className="sr-only" htmlFor="task-input">Describe what you need</label>
              <textarea id="task-input" rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitTask(draft); }
              }} placeholder="Tell me what you need…" maxLength={6000} />
              <button className={`mic-button ${audio.active ? 'mic-button--active' : ''}`} type="button" onClick={toggleMic} aria-pressed={audio.active || audio.starting} aria-label={audio.starting ? 'Microphone starting. Cancel.' : audio.active ? 'Microphone on. Turn off.' : 'Microphone off. Turn on.'} title={audio.starting ? 'Microphone starting. Cancel.' : audio.active ? 'Microphone on. Turn off.' : 'Microphone off. Turn on.'}>
                {audio.active ? <MicOff size={20} aria-hidden="true" /> : <Mic size={20} aria-hidden="true" />}<span>{audio.starting ? 'Cancel mic' : audio.active ? 'Mic on' : 'Mic off'}</span>
              </button>
              <button className="send-button" type="submit" disabled={!draft.trim() || connection !== 'connected' || status.state === 'working' || taskDispatchRef.current} aria-label="Send message"><Send size={22} aria-hidden="true" /></button>
            </form>
            <p className="composer-caption"><AudioLines size={16} aria-hidden="true" /> Microphone and Stop are separate controls. Voice never confirms an action.</p>
          </div>
        </section>

        <aside className={`website-panel ${viewMode === 'website' ? 'mobile-visible' : ''}`} aria-label="Website session">
          <div className="website-heading">
            <div><p className="overline">BROWSER SESSION</p><h2><Globe2 size={22} aria-hidden="true" /> Website</h2></div>
            {browser?.demo && <span className="demo-tag">Test environment</span>}
          </div>
          {browser ? (
            <>
              <div className="browser-frame">
                <div className="browser-chrome"><span className="browser-dots" aria-hidden="true"><i /><i /><i /></span><span className="browser-address">{browserHost}</span></div>
                <img className="browser-screenshot" src={browser.image} alt={`Latest screenshot from ${browserUrl}`} />
              </div>
              <div className="browser-meta">
                <a href={browserUrl} target="_blank" rel="noreferrer">{browserUrl}</a>
                <span>Last observed {formatDate(browser.updatedAt)}</span>
              </div>
              <p className="browser-note">This is the latest view from the same browser session used for your task. It is a screenshot, not an interactive browser.</p>
            </>
          ) : (
            <div className="browser-empty"><Globe2 size={36} aria-hidden="true" /><p>The website view will appear here when the assistant opens a test provider.</p></div>
          )}
        </aside>
      </div>

      <Dialog.Root
        open={editingProfile}
        onOpenChange={(open) => {
          if (open) setEditingProfile(true);
          else if (completed && !sessionOnlyAvailable) setEditingProfile(false);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="profile-dialog-overlay" />
          <Dialog.Content className="profile-dialog-content" aria-describedby="profile-dialog-description">
            <Dialog.Title className="sr-only">Your profile</Dialog.Title>
            <Dialog.Description id="profile-dialog-description" className="sr-only">
              Edit details stored in this browser. Website sharing is reviewed separately for each task.
            </Dialog.Description>
            <ProfileWizard
              initialProfile={profile}
              onSave={saveProfileChange}
              onClose={completed && !sessionOnlyAvailable ? () => setEditingProfile(false) : undefined}
              storageError={storageError}
            />
            {sessionOnlyAvailable && <div className="profile-session-choice" role="status">
              <p>Your unsaved changes are only in this browser session.</p>
              <button type="button" onClick={useProfileForSession}>Use these details for this session only</button>
            </div>}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {completed && !editingProfile && <button className="delete-profile-button" type="button" onClick={deleteSavedProfile}>Delete saved details</button>}
      <span className="sr-only" aria-live="polite">{connectionLabel}. {status.text}{socketRevision ? '' : ''}</span>
    </main>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  return <article className={`message-row message-row--${message.role}`} aria-label={message.role === 'assistant' ? 'Assistant' : 'You'}>
    {message.role === 'assistant' && <span className="assistant-avatar message-avatar" aria-hidden="true">e</span>}
    <div className="message-content">
      <p>{message.text}</p>
      {message.local && <small>Sending…</small>}
      {message.deliveryUnknown && <small>Delivery was not confirmed. Check the conversation before retrying.</small>}
    </div>
  </article>;
}

function ApprovalReview({ approval, checked, setChecked, onConfirm, disabled = false }: { approval: Approval; checked: boolean; setChecked: (checked: boolean) => void; onConfirm: () => void; disabled?: boolean }) {
  const Card = {
    event: EventCard,
    journey: JourneyCard,
    appointment: AppointmentCard,
    government: GovernmentCard,
    service: ServiceCard,
    leisure: LeisureCard,
  }[approval.offer.kind];
  const requestKind = approval.offer.kind === 'government' || approval.offer.kind === 'service' || approval.offer.kind === 'leisure';
  const actionButtonLabel = requestKind
    ? `${approval.actionLabel}${approval.offer.demo ? ' · test only; no real commitment' : ''}`
    : 'Confirm test booking';
  return <section className="approval-review" aria-labelledby={`approval-${approval.id}`}>
    <header className="approval-header"><ShieldCheck size={24} aria-hidden="true" /><div><p className="overline">YOUR REVIEW</p><h2 id={`approval-${approval.id}`}>Check before you confirm</h2></div></header>
    <p className="approval-provider">{approval.actionLabel} with <strong>{approval.site}</strong></p>
    <Card offer={approval.offer} disabled />
    <section className="disclosure-block" aria-labelledby={`sent-${approval.id}`}>
      <h3 id={`sent-${approval.id}`}>Information that will be sent</h3>
      {approval.transmittedFields.length > 0 ? <dl className="transmitted-fields">{approval.transmittedFields.map((field, index) => <div key={`${field.label}-${index}`}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl> : <p>No personal details are listed for this action.</p>}
    </section>
    <section className="disclosure-block" aria-labelledby={`consequences-${approval.id}`}>
      <h3 id={`consequences-${approval.id}`}>What this action means</h3>
      <p><strong>{approval.action}</strong></p>
      <ul>{approval.consequences.map((consequence, index) => <li key={`${index}-${consequence}`}>{consequence}</li>)}</ul>
    </section>
    <label className="confirm-check"><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => setChecked(event.target.checked)} /><span>{disabled ? 'This review is no longer active.' : 'I have reviewed the details above.'}</span></label>
    <button className="confirm-button" type="button" onClick={onConfirm} disabled={disabled || !checked || approval.expiresAt <= Date.now()}><Check size={21} aria-hidden="true" /> {actionButtonLabel}</button>
    <p className="approval-expiry">This review expires {new Date(approval.expiresAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}. Confirm only if these details are correct.</p>
  </section>;
}

function ResultCard({ result }: { result: ResultView }) {
  const requestReceived = result.outcome === 'request_received';
  const confirmed = result.outcome === 'booking_confirmed' || (!result.outcome && result.state === 'confirmed');
  const success = requestReceived || confirmed;
  const heading = requestReceived ? 'REQUEST RECEIVED' : confirmed ? 'CONFIRMED' : 'RESULT UNCLEAR';
  return <section className={`result-card ${success ? 'result-card--confirmed' : 'result-card--unclear'}`} role="status">
    {success ? <Check size={23} aria-hidden="true" /> : <CircleAlert size={23} aria-hidden="true" />}
    <div><p className="overline">{heading}</p><p>{result.text}</p>{result.reference && <p>Reference: {result.reference}</p>}{result.demo && <span className="demo-tag">{requestReceived ? 'Test environment · no real commitment' : 'Test environment · no real payment'}</span>}</div>
  </section>;
}

function kindHint(text: string): Offer['kind'] | null {
  const normalized = text.toLowerCase();
  if (/\b(civic office|government|municipal|public office|permit office)\b/.test(normalized)) return 'government';
  if (/\b(repair|home service|tradesperson|contractor|plumber|electrician|handyperson)\b/.test(normalized)) return 'service';
  if (/\b(community course|course|exhibition|club activity|community centre)\b/.test(normalized)) return 'leisure';
  if (/\b(doctor|appointment|clinic|practice|physician|medical)\b/.test(normalized)) return 'appointment';
  if (/\b(train|journey|travel|bus|route|from .+ to )\b/.test(normalized)) return 'journey';
  if (/\b(concert|event|theatre|theater|ticket|show|game)\b/.test(normalized)) return 'event';
  return null;
}

function phaseText(phase?: string, requestKind = false): string {
  switch (phase) {
    case 'prepared': return 'Action prepared. Review the details before confirming.';
    case 'submitted': return 'Action submitted. Waiting for the provider result.';
    case 'confirmed': return requestKind
      ? 'The test request was received. This does not confirm a real appointment, service, or enrollment.'
      : 'Action confirmed by the test provider.';
    case 'unclear': return 'The result is unclear. Do not retry until the provider state is checked.';
    default: return '';
  }
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
