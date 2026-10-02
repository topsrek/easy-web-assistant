import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import { ApprovalGate, type ApprovalBinding } from './approval.js';
import { BrowserSession } from './browser.js';
import { config, type AppConfig } from './config.js';
import { AssistantAI } from './ai.js';
import { ToolBroker } from './broker.js';
import { appointmentProvider } from './providers/appointments.js';
import { eventProvider } from './providers/events.js';
import { journeyProvider } from './providers/journeys.js';
import { governmentProvider } from './providers/government.js';
import { serviceProvider } from './providers/services.js';
import { leisureProvider } from './providers/leisure.js';
import { VoiceSession } from './voice.js';
import { buildOfferSurface, neededProfileFor, serverEventSchema, type ClientMessage, type Offer, type Profile, type Provider, type ServerEvent, type TaskKind } from '../shared/schema.js';
import { demoOffers, inferKind } from './demo.js';

const providers = { event: eventProvider, journey: journeyProvider, appointment: appointmentProvider,
  government: governmentProvider, service: serviceProvider, leisure: leisureProvider } satisfies Record<TaskKind, Provider>;
const uuid = () => randomUUID();

/** One ephemeral controller and one isolated browser per WebSocket. */
export class AssistantSession {
  readonly id = uuid();
  readonly approvalGate = new ApprovalGate();
  readonly browser: BrowserSession;
  readonly broker: ToolBroker;
  private readonly assistant: AssistantAI;
  private voice?: VoiceSession;
  private alive = true;
  private inFlight = false;
  private version = 0;
  private currentKind?: TaskKind;
  private currentProfile = undefined as Profile | undefined;
  private pendingBinding?: ApprovalBinding;
  private readonly offers = new Map<string, Offer>();

  constructor(
    private readonly socket: WebSocket,
    private readonly origin: string,
    private readonly fixtureOrigin: string,
    private readonly settings: AppConfig = config,
  ) {
    this.browser = new BrowserSession(fixtureOrigin, this.id);
    this.broker = new ToolBroker(this.browser, this.approvalGate);
    this.assistant = new AssistantAI(settings);
  }

  getFixtureOffers(kind: TaskKind) { return [...this.offers.values()].filter((offer) => offer.kind === kind); }

  private emit(event: ServerEvent) {
    if (!this.alive || this.socket.readyState !== this.socket.OPEN) return;
    const withTurnId = event.type === 'transcript' && event.role === 'user' && event.final && !event.id
      ? { ...event, id: uuid() } : event;
    this.socket.send(JSON.stringify(serverEventSchema.parse(withTurnId)));
  }
  private message(role: 'assistant' | 'user', text: string) { this.emit({ type: 'message', id: uuid(), role, text }); }
  private status(text: string, state: 'idle' | 'working' | 'paused' | 'waiting' | 'complete', phase?: 'prepared' | 'submitted' | 'confirmed' | 'unclear') {
    this.emit({ type: 'status', text, state, version: this.version, ...(phase ? { phase } : {}) });
  }
  async start() {
    // Website adapters are controlled fixtures even when a model is configured.
    this.emit({ type: 'ready', mode: 'demo', voiceAvailable: this.assistant.status().available });
    await this.broadcastBrowser();
  }

  async handle(raw: ClientMessage) {
    if (!this.alive) return;
    if (raw.type === 'task') return this.runTask(raw.text, raw.profile);
    if (raw.type === 'select') return this.select(raw.offerId, raw.version, raw.profile);
    if (raw.type === 'confirm') return this.confirm(raw.token, raw.version, raw.profile);
    if (raw.type === 'profile_changed') return this.profileChanged();
    if (raw.type === 'stop') return this.stop();
    if (raw.type === 'reset') return this.reset();
    if (raw.type === 'voice_start') return this.startVoice();
    if (raw.type === 'voice_stop') return this.stopVoice();
    if (raw.type === 'audio') {
      try { this.voice?.sendAudio(raw.data); } catch (error) { this.emit({ type: 'error', message: safeError(error) }); }
    }
  }

  private async runTask(text: string, profile: Profile) {
    if (this.inFlight) return this.emit({ type: 'error', message: 'Please wait for the current step to finish or stop it first.' });
    this.invalidate('A new request started. Previous approval is no longer current.', false);
    this.inFlight = true;
    const taskVersion = this.version;
    this.message('user', text);
    this.status('Understanding your request…', 'working');
    try {
      const interpreted = await this.assistant.interpretTask(text);
      if (!this.alive || taskVersion !== this.version) return;
      const kind = inferKind(text) ?? interpreted.kind;
      if (!kind) {
        this.message('assistant', 'I can help with events, journeys, appointments, government requests, local services, and leisure activities. Tell me which one you would like to find.');
        this.status('Waiting for a supported request.', 'idle');
        return;
      }
      this.currentKind = kind;
      const projectedProfile = neededProfileFor(kind, profile, { homeVisit: false });
      this.currentProfile = projectedProfile;
      const provider = providers[kind];
      const knownOffers = demoOffers(kind, this.fixtureOrigin, this.id);
      // Populate the session fixture first, then let the provider inspect it through
      // the actual isolated browser and preserve the user's unmodified constraints.
      this.offers.clear();
      for (const offer of knownOffers) this.offers.set(offer.id, offer);
      const offers = await provider.search(this.browser, text);
      if (!this.alive || taskVersion !== this.version) return;
      this.offers.clear();
      for (const offer of offers) this.offers.set(offer.id, offer);
      if (!offers.length) {
        this.message('assistant', 'I could not verify a matching option in this fixed fictional demo listing. Your requested conditions have not been relaxed.');
        this.status('No verified match in the controlled test provider.', 'complete');
        return;
      }
      await this.browser.readOffers(kind);
      if (!this.alive || taskVersion !== this.version) return;
      offers.forEach((offer, index) => {
        const id = `offers-${kind}-${this.version}-${index + 1}`;
        this.emit({ type: 'cards', id, messages: buildOfferSurface(offer, this.version, id), version: this.version });
      });
      const summary = await this.assistant.summarizeObservation(offers);
      if (!this.alive || taskVersion !== this.version) return;
      this.message('assistant', summary);
      await this.broadcastBrowser(taskVersion);
      if (!this.alive || taskVersion !== this.version) return;
      this.status('Choose an option to review its details.', 'waiting');
    } catch (error) {
      if (!this.alive || taskVersion !== this.version) return;
      this.message('assistant', 'I could not complete that search. Please try again.');
      this.emit({ type: 'error', message: safeError(error) });
      this.status('The search stopped before an option was prepared.', 'idle');
    } finally { if (taskVersion === this.version) this.inFlight = false; }
  }

  private async select(offerId: string, suppliedVersion: number, suppliedProfile?: Profile) {
    const offer = this.offers.get(offerId);
    if (!offer || suppliedVersion !== this.version || this.inFlight) {
      return this.emit({ type: 'error', message: 'That option is no longer current. Please search again.' });
    }
    const selectedProfile = suppliedProfile
      ? neededProfileFor(offer.kind, suppliedProfile, { homeVisit: false })
      : this.currentProfile;
    if (!selectedProfile) return this.emit({ type: 'error', message: 'Your profile is not available for this option. Please search again.' });
    this.currentKind = offer.kind;
    this.currentProfile = selectedProfile;
    const selectionVersion = this.version;
    this.inFlight = true;
    try {
      const provider = providers[offer.kind];
      const prepared = await this.broker.prepare(offer, this.version, selectedProfile, provider);
      if (!this.alive || selectionVersion !== this.version) return;
      this.pendingBinding = prepared.binding;
      this.emit({ type: 'approval', id: uuid(), offer, token: prepared.approval.token, version: prepared.approval.version,
        expiresAt: prepared.approval.expiresAt, transmittedFields: prepared.transmittedFields,
        actionLabel: prepared.actionLabel, consequences: prepared.consequences,
        action: prepared.binding.action, site: prepared.binding.site });
      this.status('Review the details before continuing.', 'waiting', 'prepared');
    } catch (error) { if (selectionVersion === this.version) this.emit({ type: 'error', message: safeError(error) }); }
    finally { if (selectionVersion === this.version) this.inFlight = false; }
  }

  private async confirm(token: string, suppliedVersion: number, profile: Profile) {
    if (suppliedVersion !== this.version || !this.currentKind || !this.currentProfile || !this.pendingBinding || this.inFlight) {
      return this.emit({ type: 'error', message: 'This review is no longer current. Please choose your option again.' });
    }
    const originalBinding = this.pendingBinding;
    const binding = freezeBinding(originalBinding);
    const operation = Object.freeze({ version: this.version, kind: this.currentKind, binding });
    const projected = neededProfileFor(operation.kind, profile);
    if (JSON.stringify(projected) !== JSON.stringify(this.currentProfile)) {
      this.invalidate('Your profile changed. Please review the data again.');
      return;
    }
    this.inFlight = true;
    this.status('Submitting the approved test action…', 'working', 'submitted');
    try {
      const result = await this.broker.submit(token, operation.binding);
      if (this.version === operation.version && this.pendingBinding === originalBinding) this.pendingBinding = undefined;
      if (!this.alive) return;
      const confirmed = result.state === 'confirmed';
      const requestOnly = isRequestOnly(operation.kind);
      const outcome = result.outcome ?? (confirmed ? requestOnly ? 'request_received' : 'booking_confirmed' : undefined);
      const text = !confirmed
        ? `The ${actionDescription(operation.kind)} result is unclear. The action was not repeated; check the test provider state before doing anything else.`
        : requestOnly
          ? `The controlled test provider received the ${operation.kind === 'government' ? 'appointment' : operation.kind === 'service' ? 'service' : 'enrollment'} request. This confirms receipt of a fictional test request only; it does not confirm an appointment, service engagement, or course participation.`
          : 'The controlled test provider confirmed the test booking.';
      this.emit({ type: 'result', id: uuid(), state: result.state,
        text, ...(result.reference ? { reference: result.reference } : {}), demo: true,
        ...(outcome ? { outcome } : {}), kind: operation.kind, version: operation.version, offerId: operation.binding.offerId });
      if (this.version === operation.version) {
        this.status(confirmed ? requestOnly ? 'Test request received.' : 'Test booking confirmed.' : 'Result unclear; no retry was made.', 'complete', confirmed ? 'confirmed' : 'unclear');
        await this.broadcastBrowser(operation.version);
      }
    } catch (error) {
      if (!this.alive) return;
      if (this.version === operation.version && this.pendingBinding === originalBinding) this.pendingBinding = undefined;
      this.emit({ type: 'result', id: uuid(), state: 'unclear',
        text: `The ${actionDescription(operation.kind)} result is unclear. ${safeError(error)} Do not assume it is safe to repeat.`,
        demo: true, kind: operation.kind, version: operation.version, offerId: operation.binding.offerId });
      if (this.version === operation.version) this.status('The action could not be confirmed. Do not assume it is safe to repeat.', 'paused', 'unclear');
    } finally { if (this.version === operation.version) this.inFlight = false; }
  }

  private invalidate(text: string, tell = true) {
    this.version += 1;
    this.approvalGate.invalidate();
    this.broker.stop();
    this.pendingBinding = undefined;
    this.inFlight = false;
    this.offers.clear();
    this.currentKind = undefined;
    this.currentProfile = undefined;
    if (tell) { this.message('assistant', text); this.status('Approval invalidated.', 'idle'); }
  }
  private profileChanged() {
    const hadActiveContext = Boolean(this.currentKind || this.offers.size || this.pendingBinding);
    this.invalidate('Your profile changed. Please choose the option again.', hadActiveContext);
    if (!hadActiveContext) this.status('Ready for a new request.', 'idle');
  }
  private async stop() {
    this.version += 1;
    this.approvalGate.invalidate();
    this.broker.stop();
    this.pendingBinding = undefined;
    this.inFlight = false;
    this.offers.clear();
    this.currentKind = undefined;
    this.currentProfile = undefined;
    this.status('Stopped. Any action already sent may still have taken effect; check its result before retrying.', 'paused');
    await this.broadcastBrowser();
  }
  private async reset() {
    this.version += 1;
    this.approvalGate.invalidate();
    this.broker.stop();
    this.pendingBinding = undefined;
    this.inFlight = true;
    this.offers.clear(); this.currentKind = undefined; this.currentProfile = undefined;
    const resetVersion = this.version;
    try {
      await this.broker.reset();
      if (this.version === resetVersion) this.status('Ready for a new request.', 'idle');
    } finally { if (this.version === resetVersion) this.inFlight = false; }
  }
  private async startVoice() {
    let voice = this.voice;
    try {
      // The final transcript is surfaced to the client, which submits one task with its stored profile.
      voice ??= new VoiceSession(this.settings, (event) => this.emit(event), () => undefined);
      this.voice = voice;
      await voice.start();
    } catch (error) {
      if (this.voice === voice) { this.voice = undefined; await voice?.stop().catch(() => undefined); }
      this.emit({ type: 'error', message: `Voice is unavailable: ${safeError(error)}` });
    }
  }
  private async stopVoice() {
    const voice = this.voice;
    this.voice = undefined;
    if (voice) await voice.stop();
    else this.emit({ type: 'voice', state: 'closed' });
  }
  private async broadcastBrowser(expectedVersion = this.version) {
    try {
      const snapshot = await this.browser.snapshot();
      if (snapshot && this.alive && expectedVersion === this.version) this.emit({ type: 'browser', ...snapshot });
    } catch { /* A failed screenshot is non-fatal; the current chat remains usable. */ }
  }
  async close() {
    if (!this.alive) return;
    this.alive = false;
    this.version += 1;
    this.approvalGate.invalidate();
    this.broker.stop();
    this.pendingBinding = undefined;
    await this.voice?.stop().catch(() => undefined);
    await this.broker.reset().catch(() => undefined);
    await this.browser.close().catch(() => undefined);
  }
}

function safeError(error: unknown) {
  if (error instanceof Error && /no longer current|choose your option again|current approved/i.test(error.message)) return error.message;
  if (error instanceof Error && [
    'Google AI could not authenticate.', 'Google AI is temporarily over its usage limit.',
    'The configured Google AI model is unavailable.', 'Google AI took too long to respond.',
    'Google AI could not complete the request.', 'Google AI is not configured.', 'Vertex AI is not configured.',
    'Vertex AI requires explicit', 'Vertex AI credentials are not configured.', 'Google Live could not authenticate.',
    'Google Live is over its current usage limit.', 'The configured Gemini Live model is unavailable.',
    'The Google Live connection timed out.', 'The Google Live connection failed.',
    'Voice is disabled in deterministic demo mode.', 'Voice is not connected.', 'The audio could not be sent.',
  ].some((prefix) => error.message.startsWith(prefix))) return error.message.slice(0, 1000);
  return 'The request failed unexpectedly. Please try again.';
}

function isRequestOnly(kind: TaskKind) { return kind === 'government' || kind === 'service' || kind === 'leisure'; }
function actionDescription(kind: TaskKind) {
  return kind === 'government' ? 'appointment request'
    : kind === 'service' ? 'service request'
      : kind === 'leisure' ? 'enrollment request'
        : 'booking';
}
function freezeBinding(binding: ApprovalBinding): ApprovalBinding {
  const amounts = Object.freeze({ ...binding.amounts, unknownCosts: Object.freeze([...binding.amounts.unknownCosts]) });
  const inputs = Object.freeze({ ...binding.inputs });
  return Object.freeze({ ...binding, amounts, inputs }) as ApprovalBinding;
}
