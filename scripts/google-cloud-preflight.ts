import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FunctionCallingConfigMode, GoogleGenAI, Modality, Type, type Session } from '@google/genai';
import { cloudConfigurationIssues, config } from '../server/config.js';

const wantsModels = process.argv.includes('--check-models');
const wantsLive = process.argv.includes('--check-live');
const unknownFlags = process.argv.slice(2).filter((arg) => arg !== '--check-models' && arg !== '--check-live');
if (unknownFlags.length) {
  console.error(`Unknown option: ${unknownFlags[0]}`);
  console.error('Usage: npx tsx scripts/google-cloud-preflight.ts [--check-models] [--check-live]');
  process.exit(2);
}

const env = process.env;
// ADC prioritizes an explicit credentials path. Do not mask a missing explicit
// path with an unrelated cached default credentials file.
const adcCandidates = env.GOOGLE_APPLICATION_CREDENTIALS
  ? [env.GOOGLE_APPLICATION_CREDENTIALS]
  : [
      env.CLOUDSDK_CONFIG ? join(env.CLOUDSDK_CONFIG, 'application_default_credentials.json') : undefined,
      env.APPDATA ? join(env.APPDATA, 'gcloud', 'application_default_credentials.json') : undefined,
      join(homedir(), '.config', 'gcloud', 'application_default_credentials.json'),
    ].filter((path): path is string => Boolean(path));
const adcFileFound = adcCandidates.some((path) => existsSync(path));
const portableGcloud = fileURLToPath(new URL('../.cache/google-cloud-tools/cli-587/google-cloud-sdk/bin/gcloud.cmd', import.meta.url));
const gcloudFound = existsSync(portableGcloud) || spawnSync('gcloud', ['--version'], { stdio: 'ignore', timeout: 3000 }).status === 0;
const hasKey = Boolean(config.geminiApiKey);
const hasGoogleCredentials = config.aiProvider === 'gemini' ? hasKey : config.vertexAdcConfigured;

console.log('Google configuration preflight (local checks only)');
console.log(`Provider: ${config.aiProvider}`);
console.log(`Gemma model: ${config.gemmaModel}`);
console.log(`Gemini model: ${config.geminiModel}`);
console.log(`Live model: ${config.liveModel}`);
console.log(`Gemini API key configured: ${hasKey ? 'yes' : 'no'}`);
console.log(`ADC credential file detected: ${adcFileFound ? 'yes' : 'no'}`);
console.log(`gcloud CLI detected: ${gcloudFound ? 'yes' : 'no'}`);
console.log('Credential contents and paths are not displayed. Configuration does not prove access.');

const issues = cloudConfigurationIssues(config);
if (issues.length) {
  for (const issue of issues) console.error(`Missing: ${issue}`);
  console.log('Result: Google access is not configured. Demo mode can still run locally.');
  process.exitCode = 1;
}

function category(error: unknown): string {
  const detail = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  if (/timeout|timed out|deadline/i.test(detail)) return 'timeout';
  if (/quota|resource.?exhausted|rate.?limit|429/i.test(detail)) return 'quota';
  if (/unauth|permission|forbidden|credential|api.?key|401|403/i.test(detail)) return 'auth';
  if (/not found|model|404/i.test(detail)) return 'model';
  if (/fetch|network|socket|econn|dns|unavailable|503|502/i.test(detail)) return 'network';
  if (/invalid|bad request|400|argument/i.test(detail)) return 'request';
  return 'unknown';
}

function makeClient() {
  if (config.aiProvider === 'vertex') {
    return new GoogleGenAI({ vertexai: true, project: config.googleCloudProject!, location: config.googleCloudLocation });
  }
  return new GoogleGenAI({ apiKey: config.geminiApiKey! });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('probe timeout')), ms); }),
  ]).finally(() => clearTimeout(timer!));
}

async function connectWithTimeout(ai: GoogleGenAI, options: Parameters<typeof ai.live.connect>[0]): Promise<Session> {
  const controller = new AbortController();
  let timedOut = false;
  const connectPromise = ai.live.connect({
    ...options,
    config: { ...options.config, abortSignal: controller.signal },
  });
  void connectPromise.then((lateSession) => { if (timedOut) lateSession.close(); }, () => {});
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      connectPromise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(new Error('connection timeout'));
        }, 8000);
      }),
    ]);
  } finally {
    clearTimeout(timer!);
  }
}

async function checkModels(): Promise<boolean> {
  console.log('\nMinimal model and tool checks (one request per capability)');
  const ai = makeClient();
  let ok = true;
  try {
    const response = await ai.models.generateContent({
      model: config.gemmaModel,
      contents: 'Return only a JSON object with keys "plan" and "safe". Use plan="ready" and safe=true.',
      config: { abortSignal: AbortSignal.timeout(15000) },
    });
    let parsed: unknown;
    try { parsed = JSON.parse(response.text ?? ''); } catch { parsed = undefined; }
    const gemmaOk = typeof parsed === 'object' && parsed !== null &&
      'plan' in parsed && parsed.plan === 'ready' && 'safe' in parsed && parsed.safe === true;
    console.log(`Gemma generateContent + JSON plan validation: ${gemmaOk ? 'PASS' : 'FAIL (response did not match probe schema)'}`);
    ok &&= gemmaOk;
  } catch (error) {
    console.log(`Gemma generateContent: FAIL (${category(error)})`);
    ok = false;
  }
  try {
    const response = await ai.models.generateContent({
      model: config.geminiModel,
      contents: 'Reply with the single word ready.',
      config: { abortSignal: AbortSignal.timeout(15000) },
    });
    const answered = Boolean(response.text?.trim());
    console.log(`Gemini generateContent response: ${answered ? 'PASS' : 'FAIL (empty response)'}`);
    ok &&= answered;
  } catch (error) {
    console.log(`Gemini generateContent: FAIL (${category(error)})`);
    ok = false;
  }
  try {
    const response = await ai.models.generateContent({
      model: config.geminiModel,
      contents: 'Call report_probe with ok=true. This is a harmless capability check.',
      config: {
        abortSignal: AbortSignal.timeout(15000),
        tools: [{ functionDeclarations: [{ name: 'report_probe', description: 'Report a harmless capability probe.', parameters: {
          type: Type.OBJECT, properties: { ok: { type: Type.BOOLEAN } }, required: ['ok'],
        } }] }],
        toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY, allowedFunctionNames: ['report_probe'] } },
      },
    });
    const called = response.functionCalls?.some((call) => call.name === 'report_probe') ?? false;
    console.log(`Gemini function calling: ${called ? 'PASS' : 'FAIL (probe function was not called)'}`);
    ok &&= called;
  } catch (error) {
    console.log(`Gemini function calling: FAIL (${category(error)})`);
    ok = false;
  }
  return ok;
}

async function checkLive(): Promise<boolean> {
  console.log('\nLive API check (audio output, text response, and tool call measured separately)');
  const ai = makeClient();
  let session: Session | undefined;
  let sawAudio = false;
  let sawServerResponse = false;
  let sawToolCall = false;
  let rejectProbe: ((error: Error) => void) | undefined;
  let resolveAudio: (() => void) | undefined;
  let resolveTool: (() => void) | undefined;
  try {
    session = await connectWithTimeout(ai, {
      model: config.liveModel,
      config: { responseModalities: [Modality.AUDIO], maxOutputTokens: 64 },
      callbacks: {
        onmessage: (message) => {
          const parts = message.serverContent?.modelTurn?.parts ?? [];
          if (message.serverContent) sawServerResponse = true;
          if (parts.some((part) => Boolean(part.inlineData?.data))) {
            sawAudio = true;
          }
          if (sawAudio && sawServerResponse) resolveAudio?.();
        },
        onerror: () => rejectProbe?.(new Error('live connection error')),
      },
    });
    const responsePromise = new Promise<void>((resolve, reject) => {
      resolveAudio = resolve;
      rejectProbe = reject;
    });
    session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: 'Say the word ready.' }] }], turnComplete: true });
    await withTimeout(responsePromise, 12000);
  } catch (error) {
    console.log(`Live audio/text probe: FAIL (${category(error)})`);
  } finally {
    console.log(`Live audio output received: ${sawAudio ? 'yes' : 'no'}`);
    console.log(`Live server response received: ${sawServerResponse ? 'yes' : 'no'}`);
    session?.close();
  }

  let toolSession: Session | undefined;
  try {
    toolSession = await connectWithTimeout(ai, {
      model: config.liveModel,
      config: {
        responseModalities: [Modality.AUDIO],
        maxOutputTokens: 64,
        tools: [{ functionDeclarations: [{ name: 'report_live_probe', description: 'Report a harmless Live API capability probe.', parameters: {
          type: Type.OBJECT, properties: { ok: { type: Type.BOOLEAN } }, required: ['ok'],
        } }] }],
      },
      callbacks: {
        onmessage: (message) => {
          if (message.toolCall?.functionCalls?.some((call) => call.name === 'report_live_probe')) {
            sawToolCall = true;
            resolveTool?.();
          }
        },
        onerror: () => rejectProbe?.(new Error('live tool probe error')),
      },
    });
    const toolPromise = new Promise<void>((resolve, reject) => {
      resolveTool = resolve;
      rejectProbe = reject;
    });
    toolSession.sendClientContent({ turns: [{ role: 'user', parts: [{ text: 'Call report_live_probe with ok=true for this harmless capability check.' }] }], turnComplete: true });
    await withTimeout(toolPromise, 10000);
  } catch (error) {
    console.log(`Live tool capability: FAIL (${category(error)})`);
  } finally {
    toolSession?.close();
  }
  console.log(`Live tool call requested by model: ${sawToolCall ? 'yes' : 'no'}`);
  return sawAudio && sawServerResponse && sawToolCall;
}

if ((wantsModels || wantsLive) && hasGoogleCredentials && issues.length === 0) {
  let allPassed = true;
  if (wantsModels) allPassed = (await checkModels()) && allPassed;
  if (wantsLive) allPassed = (await checkLive()) && allPassed;
  if (!allPassed) process.exitCode = 1;
} else if (wantsModels || wantsLive) {
  console.log('\nOnline checks skipped: provider credentials or explicit configuration are missing.');
  process.exitCode = 1;
}
