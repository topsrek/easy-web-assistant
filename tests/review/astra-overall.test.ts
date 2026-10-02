import { describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import type { TaskKind, ServerEvent } from '../../shared/schema.js';

// Keep this review entirely offline: config is mocked before any server import,
// so importing the controller cannot load .env or inspect local credentials.
vi.mock('../../server/config.js', () => ({ config: { demoMode: true } }));
vi.mock('../../server/ai.js', () => ({
  AssistantAI: class {
    status() { return { available: false }; }
    async interpretTask(text: string) { return { kind: null, text }; }
    async summarizeObservation() { return 'Controlled review fixture.'; }
  },
}));
vi.mock('../../server/voice.js', () => ({ VoiceSession: class {} }));
vi.mock('../../server/browser.js', () => ({
  BrowserSession: class {
    constructor(public fixtureOrigin: string, public sessionId: string) {}
    ownsSession(id: string) { return id === this.sessionId; }
    async readOffers(_kind: TaskKind) { return []; }
    async snapshot() { return null; }
    async close() {}
    async submitPrepared() { return {}; }
    async checkResult() { return true; }
    async checkCurrentResult() { return null; }
  },
}));

import { demoOffers, fixtureHtml } from '../../server/demo.js';
import { journeyProvider } from '../../server/providers/journeys.js';
import { AssistantSession } from '../../server/session.js';
import { emptyProfile, neededProfileFor } from '../../shared/schema.js';

const origin = 'http://127.0.0.1:4000';

describe('independent overall review regressions', () => {
  it('retains the train when an explicit departure time matches its stated time', async () => {
    const offers = await journeyProvider.search(
      { readOffers: async () => demoOffers('journey', origin) },
      'Find a train at 9:15 AM',
    );
    expect(offers.map(offer => offer.id)).toEqual(['journey-direct']);
  });

  it('exposes original source conditions visibly, outside the machine-readable JSON script', () => {
    const offers = demoOffers('event', origin, 'synthetic-session');
    const visibleHtml = fixtureHtml('event', origin, 'synthetic-session', offers)
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    expect(visibleHtml).toContain('Refund and transfer conditions have not been provided.');
  });

  it('keeps a late request receipt attached to its original action without completing the next task', async () => {
    const events: ServerEvent[] = [];
    const socket = { OPEN: 1, readyState: 1, send: (payload: string) => events.push(JSON.parse(payload)) };
    const session = new AssistantSession(socket as unknown as WebSocket, 'http://127.0.0.1:5173', origin);
    vi.spyOn(session.browser, 'readOffers').mockImplementation(async kind => session.getFixtureOffers(kind));
    let finishSubmission!: (value: { reference: string; outcome: 'request_received' }) => void;
    const response = new Promise<{ reference: string; outcome: 'request_received' }>(resolve => { finishSubmission = resolve; });
    vi.spyOn(session.browser, 'submitPrepared').mockReturnValue(response);
    const profile = neededProfileFor('government', { ...emptyProfile, fullName: 'Review Person', email: 'review@example.test' });

    await session.handle({ type: 'task', text: 'Find a government appointment', profile });
    const cards = events.find((event): event is Extract<ServerEvent, { type: 'cards' }> => event.type === 'cards')!;
    await session.handle({ type: 'select', offerId: 'government-civic-appointment', version: cards.version });
    const approval = events.find((event): event is Extract<ServerEvent, { type: 'approval' }> => event.type === 'approval')!;
    const pending = session.handle({ type: 'confirm', token: approval.token, version: approval.version, profile });
    await session.handle({ type: 'stop' });
    await session.handle({ type: 'task', text: 'Find a concert', profile: neededProfileFor('event', profile) });
    const latestCards = events.filter((event): event is Extract<ServerEvent, { type: 'cards' }> => event.type === 'cards').at(-1)!;
    const boundary = events.length;
    finishSubmission({ reference: 'DEMO-SYNTHETIC', outcome: 'request_received' });
    await pending;

    const late = events.slice(boundary);
    const receipt = late.find((event): event is Extract<ServerEvent, { type: 'result' }> => event.type === 'result');
    expect(receipt?.outcome).toBe('request_received');
    expect(receipt?.text).toMatch(/received.*appointment.*request/i);
    expect(late.some(event => event.type === 'status' && event.version === latestCards.version && event.state === 'complete')).toBe(false);
    await session.close();
  });
});
