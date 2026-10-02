import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import type { Offer, Profile, TaskKind } from '../shared/schema.js';
import type { ApprovalBinding } from '../server/approval.js';

const { browserOffers } = vi.hoisted(() => ({ browserOffers: new Map<string, unknown[]>() }));

vi.mock('../server/config.js', () => ({ config: { demoMode: true } }));
vi.mock('../server/ai.js', () => ({
  AssistantAI: class {
    status() { return { available: false }; }
    async interpretTask(text: string) { return { kind: null, text }; }
    async summarizeObservation() { return 'Controlled test listing.'; }
  },
}));
vi.mock('../server/voice.js', () => ({ VoiceSession: class {} }));
vi.mock('../server/browser.js', () => ({
  BrowserSession: class {
    constructor(public fixtureOrigin: string, public sessionId: string) {}
    ownsSession(id: string) { return id === this.sessionId; }
    async readOffers(kind: string) {
      return (browserOffers.get(this.sessionId) ?? []).filter((offer) => (offer as { kind?: string }).kind === kind);
    }
    async snapshot() { return null; }
    async close() {}
    async submitPrepared() { return {}; }
    async checkResult() { return false; }
    async checkCurrentResult() { return null; }
  },
}));

import { AssistantSession } from '../server/session.js';
import { demoOffers } from '../server/demo.js';
import { emptyProfile, type ServerEvent } from '../shared/schema.js';

const origin = 'http://127.0.0.1:4123';

function makeSession() {
  const events: ServerEvent[] = [];
  const socket = { OPEN: 1, readyState: 1, send: (payload: string) => events.push(JSON.parse(payload)) };
  const session = new AssistantSession(socket as unknown as WebSocket, 'http://127.0.0.1:5173', origin);
  return { session, events };
}

type SessionInternals = {
  offers: Map<string, Offer>;
  currentKind?: TaskKind;
  currentProfile?: Profile;
  version: number;
  pendingBinding?: ApprovalBinding;
};

describe('controller profile and stale selection boundaries', () => {
  afterEach(() => browserOffers.clear());

  it('uses the selected offer kind to minimize a profile supplied with the select message', async () => {
    const { session, events } = makeSession();
    const governmentOffer = demoOffers('government', origin, session.id)[0];
    browserOffers.set(session.id, [governmentOffer]);
    const internal = session as unknown as SessionInternals;
    internal.offers.set(governmentOffer.id, governmentOffer);
    // Deliberately leave the previous task kind different from the card's actual kind.
    internal.currentKind = 'event';
    internal.currentProfile = emptyProfile;
    const profile = {
      ...emptyProfile,
      fullName: 'Review Person', email: 'review@example.test', phone: '555-0101',
      street: '1 Private Street', city: 'Example City', postalCode: '90210', country: 'US',
    };

    await session.handle({ type: 'select', offerId: governmentOffer.id, version: internal.version, profile });

    const approval = events.find((event): event is Extract<ServerEvent, { type: 'approval' }> => event.type === 'approval');
    expect(approval?.offer.kind).toBe('government');
    expect(approval?.transmittedFields).toEqual([
      { label: 'Full name', value: 'Review Person' },
      { label: 'Email', value: 'review@example.test' },
    ]);
    expect(internal.currentKind).toBe('government');
    await session.close();
  });

  it('rejects an old offer ID even when Stop is followed by a message using the new version', async () => {
    const { session, events } = makeSession();
    const offer = demoOffers('event', origin, session.id)[0];
    const internal = session as unknown as SessionInternals;
    internal.offers.set(offer.id, offer);
    internal.currentKind = 'event';
    internal.currentProfile = emptyProfile;
    const prepare = vi.spyOn(session.broker, 'prepare');

    await session.handle({ type: 'stop' });
    const stoppedVersion = internal.version;
    await session.handle({ type: 'select', offerId: offer.id, version: stoppedVersion, profile: emptyProfile });

    expect(internal.offers.size).toBe(0);
    expect(prepare).not.toHaveBeenCalled();
    expect(events.some((event) => event.type === 'approval')).toBe(false);
    await session.close();
  });

  it('keeps first-save profile_changed out of the timeline while returning to ready', async () => {
    const { session, events } = makeSession();

    await session.handle({ type: 'profile_changed', profile: emptyProfile });

    expect(events.some((event) => event.type === 'message')).toBe(false);
    expect(events.find((event) => event.type === 'status')).toMatchObject({
      text: 'Ready for a new request.', state: 'idle', version: 1,
    });
    await session.close();
  });

  it('shows profile_changed guidance and invalidates an active approval', async () => {
    const { session, events } = makeSession();
    const offer = demoOffers('event', origin, session.id)[0];
    browserOffers.set(session.id, [offer]);
    const internal = session as unknown as SessionInternals;
    internal.offers.set(offer.id, offer);
    internal.currentKind = 'event';
    internal.currentProfile = emptyProfile;
    const prepared = await session.broker.prepare(offer, 0, emptyProfile);
    internal.pendingBinding = prepared.binding;

    await session.handle({ type: 'profile_changed', profile: emptyProfile });

    expect(events.some((event) => event.type === 'message' && event.text === 'Your profile changed. Please choose the option again.')).toBe(true);
    expect(internal.pendingBinding).toBeUndefined();
    expect(() => session.approvalGate.consume(prepared.approval.token, prepared.binding)).toThrow(/no longer current/i);
    await session.close();
  });
});
