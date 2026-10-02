import {
  buildOfferSurface,
  clientMessageSchema,
  emptyProfile,
  neededProfileFor,
  type ClientMessage,
  type Offer,
  type Profile,
  type ServerEvent,
  type TaskKind,
} from '../../shared/schema';
import { pagesDemoOffers, pagesDemoOffersForText } from './fixtures';

type PendingApproval = {
  token: string;
  offer: Offer;
  profile: Profile;
  version: number;
  expiresAt: number;
  transmittedFields: Array<{ label: string; value: string }>;
};

const fieldLabels: Record<keyof Profile, string> = {
  fullName: 'Name', email: 'Email', phone: 'Phone', street: 'Street', city: 'City', postalCode: 'Postal code', country: 'Country',
  deliveryAddress: 'Delivery address', billingAddress: 'Billing address', homeStation: 'Home station', accessNeeds: 'Access needs', appointmentPreference: 'Appointment preference',
};

const actionLabels: Record<TaskKind, string> = {
  event: 'Simulate test booking', journey: 'Simulate test booking', appointment: 'Simulate test booking',
  government: 'Simulate test appointment request', service: 'Simulate test service request', leisure: 'Simulate test enrollment request',
};

const closeConsequences = [
  'This action is simulated in the current browser tab only.',
  'No provider is contacted; no real booking, payment, appointment, service, or enrollment is made.',
];

/** In-memory Pages transport. It implements the app's WebSocket callback shape without opening a network connection. */
export class PagesDemoTransport {
  readyState: number = WebSocket.CONNECTING;
  onopen: ((this: WebSocket, event: Event) => unknown) | null = null;
  onmessage: ((this: WebSocket, event: MessageEvent) => unknown) | null = null;
  onerror: ((this: WebSocket, event: Event) => unknown) | null = null;
  onclose: ((this: WebSocket, event: CloseEvent) => unknown) | null = null;

  private version = 0;
  private eventSequence = 0;
  private pending: PendingApproval | null = null;
  private currentOffers: Offer[] = [];
  private usedTokens = new Set<string>();
  private taskTimer: number | null = null;

  constructor() {
    queueMicrotask(() => {
      if (this.readyState !== WebSocket.CONNECTING) return;
      this.readyState = WebSocket.OPEN;
      this.onopen?.call(this as unknown as WebSocket, new Event('open'));
      this.emit({ type: 'ready', mode: 'demo', voiceAvailable: false });
    });
  }

  send(serialized: string): void {
    if (this.readyState !== WebSocket.OPEN) throw new Error('The Pages demo transport is closed.');
    let raw: unknown;
    try {
      raw = JSON.parse(serialized) as unknown;
    } catch {
      this.error('The message must be valid JSON.');
      return;
    }
    const parsed = clientMessageSchema.safeParse(raw);
    if (!parsed.success) {
      this.error('The message does not match the supported demo protocol.');
      return;
    }
    this.handle(parsed.data);
  }

  close(): void {
    if (this.readyState === WebSocket.CLOSED) return;
    this.cancelTask();
    this.readyState = WebSocket.CLOSED;
    this.pending = null;
    this.onclose?.call(this as unknown as WebSocket, new CloseEvent('close'));
  }

  private handle(message: ClientMessage): void {
    if (message.type === 'task') {
      this.cancelTask();
      this.pending = null;
      this.version += 1;
      this.currentOffers = pagesDemoOffersForText(message.text);
      const version = this.version;
      this.emit({ type: 'status', text: 'Preparing fictional examples in this browser…', state: 'working', version });
      this.emit({ type: 'message', id: this.nextId('user'), role: 'user', text: message.text });
      this.taskTimer = window.setTimeout(() => {
        if (version !== this.version || this.readyState !== WebSocket.OPEN) return;
        this.emit({ type: 'message', id: this.nextId('assistant'), role: 'assistant', text: this.currentOffers.length === pagesDemoOffers.length
          ? 'Here are six fixed fictional examples. Nothing was searched live.'
          : 'Here is a fixed fictional example for this category. Nothing was searched live.' });
        const messages = this.currentOffers.flatMap((offer, index) => buildOfferSurface(offer, version, `pages-demo-${version}-${index + 1}`));
        this.emit({ type: 'cards', id: `pages-demo-cards-${version}`, messages, version });
        this.emit({ type: 'status', text: 'Fictional examples are ready. Choose one to review a simulated action.', state: 'idle', version });
        this.taskTimer = null;
      }, 40);
      return;
    }

    if (message.type === 'select') {
      const offer = this.currentOffers.find((candidate) => candidate.id === message.offerId);
      if (!offer || message.version !== this.version || this.pending) {
        this.error('This demo option is stale. Start a fresh example and choose again.');
        return;
      }
      const token = `pages-demo-${message.version}-${offer.id}-${++this.eventSequence}`;
      const profile = message.profile ? neededProfileFor(offer.kind, message.profile) : emptyProfile;
      const transmittedFields = (Object.entries(profile) as Array<[keyof Profile, string]>)
        .filter((entry) => entry[1].trim().length > 0)
        .map(([key, value]) => ({ label: fieldLabels[key], value }));
      const pending: PendingApproval = { token, offer, profile, version: this.version, expiresAt: Date.now() + 5 * 60_000, transmittedFields };
      this.pending = pending;
      this.emit({
        type: 'approval', id: this.nextId('approval'), offer, token,
        version: pending.version, expiresAt: pending.expiresAt, transmittedFields,
        actionLabel: actionLabels[offer.kind],
        consequences: closeConsequences,
        action: 'This records a simulated result in this browser only; it does not submit to the fictional listing.',
        site: offer.provider,
      });
      return;
    }

    if (message.type === 'confirm') {
      const pending = this.pending;
      if (!pending || message.token !== pending.token || message.version !== this.version || pending.version !== this.version
        || pending.expiresAt <= Date.now() || this.usedTokens.has(message.token)) {
        this.error('This review is expired or no longer current. Select the test option again.');
        return;
      }
      const approvedProfile = neededProfileFor(pending.offer.kind, message.profile);
      if (JSON.stringify(approvedProfile) !== JSON.stringify(pending.profile)) {
        this.pending = null;
        this.error('The profile details changed after review. Select the test option again to review them.');
        return;
      }
      this.usedTokens.add(message.token);
      this.pending = null;
      const requestOnly = pending.offer.kind === 'government' || pending.offer.kind === 'service' || pending.offer.kind === 'leisure';
      this.emit({ type: 'status', text: 'Recording the simulated result in this browser…', state: 'working', version: this.version, phase: 'submitted' });
      this.emit({
        type: 'result', id: this.nextId('result'), state: 'confirmed', demo: true,
        outcome: requestOnly ? 'request_received' : 'booking_confirmed',
        text: requestOnly
          ? 'Simulated request receipt recorded in this browser demo. No real provider request was sent.'
          : 'Simulated test booking completed in this browser demo. No real booking or payment was made.',
        reference: `PAGES-DEMO-${pending.offer.kind.toUpperCase()}-${pending.version}`,
        kind: pending.offer.kind, version: pending.version, offerId: pending.offer.id,
      });
      return;
    }

    if (message.type === 'stop' || message.type === 'reset' || message.type === 'profile_changed') {
      this.cancelTask();
      this.pending = null;
      this.currentOffers = [];
      this.version += 1;
      this.emit({
        type: 'status', version: this.version,
        state: message.type === 'stop' ? 'paused' : 'idle',
        text: message.type === 'stop' ? 'The browser demo task was stopped.' : 'Ready when you are.',
      });
      return;
    }

    if (message.type === 'voice_start' || message.type === 'voice_stop' || message.type === 'audio') {
      if (message.type === 'voice_start') this.error('Voice is unavailable in the static browser demo.');
    }
  }

  private cancelTask(): void {
    if (this.taskTimer !== null) window.clearTimeout(this.taskTimer);
    this.taskTimer = null;
  }

  private nextId(prefix: string): string {
    return `${prefix}-${this.version}-${++this.eventSequence}`;
  }

  private error(message: string): void {
    this.emit({ type: 'error', message });
  }

  private emit(event: ServerEvent): void {
    queueMicrotask(() => {
      if (this.readyState !== WebSocket.OPEN || !this.onmessage) return;
      this.onmessage.call(this as unknown as WebSocket, new MessageEvent('message', { data: JSON.stringify(event) }));
    });
  }
}
