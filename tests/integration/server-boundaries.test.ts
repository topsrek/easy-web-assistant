import { afterAll, describe, expect, it } from 'vitest';
import { createAppServer } from '../../server/index';
import { loadConfig } from '../../server/config';
import { ApprovalGate, type ApprovalBinding } from '../../server/approval';
import { ToolBroker } from '../../server/broker';
import { demoOffers } from '../../server/demo';
import { emptyProfile, type TaskKind } from '../../shared/schema';
import type { BrowserSession } from '../../server/browser';

const app = await createAppServer({ port: 0, host: '127.0.0.1', origin: 'http://127.0.0.1:5173', settings: loadConfig({ DEMO_MODE: 'true' }) });
const origin = `http://127.0.0.1:${app.port}`;
afterAll(async () => app.close());

const binding: ApprovalBinding = {
  action: 'book', site: 'http://127.0.0.1:4000', offerId: 'event-jazz',
  inputs: { 'Full name': 'Test Person', Email: 'test@example.com' },
  amounts: { price: 70, currency: 'USD', unknownCosts: ['Booking fees are not confirmed'] }, version: 3,
};

describe('local server approval boundary', () => {
  it('reports only safe readiness and denies a direct fixture POST without a session grant', async () => {
    const health = await fetch(`${origin}/api/health`);
    expect(health.status).toBe(200);
    const healthBody = await health.json();
    expect(healthBody).toMatchObject({ ready: true });
    expect(Object.keys(healthBody).sort()).toEqual(['mode', 'ready']);
    expect(['demo', 'live']).toContain(healthBody.mode);

    const denied = await fetch(`${origin}/fixture/book`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session: 'guessed-session', offerId: 'event-jazz', capability: 'forged', inputs: binding.inputs }),
    });
    expect(denied.status).toBe(403);
  });

  it('routes private current-operation state checks to the fixed endpoint', async () => {
    const state = await fetch(`${origin}/fixture/state?session=missing-session&offerId=event-jazz&action=test_booking`, {
      headers: { 'x-fixture-operation-token': 'forged-capability' },
    });
    expect(state.status).toBe(404);
    expect(state.headers.get('content-type')).toContain('application/json');
    expect(await state.json()).toEqual({ error: 'Result not found.' });
  });

  it('invalidates a review on profile, amount, or option changes and consumes it only once', () => {
    const gate = new ApprovalGate();
    const issued = gate.issue(binding, 10_000);

    expect(() => gate.consume(issued.token, { ...binding, inputs: { 'Full name': 'Changed', Email: 'test@example.com' } }, 10_001)).toThrow(/no longer current/i);
    expect(() => gate.consume(issued.token, { ...binding, amounts: { ...binding.amounts, price: 71 } }, 10_001)).toThrow(/no longer current/i);
    expect(() => gate.consume(issued.token, { ...binding, offerId: 'another-offer' }, 10_001)).toThrow(/no longer current/i);

    const current = gate.issue(binding, 10_000);
    expect(gate.consume(current.token, binding, 10_001).token).toBe(current.token);
    expect(() => gate.consume(current.token, binding, 10_002)).toThrow(/no longer current/i);
  });

  it('rejects expired approval and does not infer consent from an empty profile', () => {
    const gate = new ApprovalGate();
    const issued = gate.issue(binding, 10_000);
    expect(() => gate.consume(issued.token, binding, issued.expiresAt)).toThrow(/no longer current/i);
    const currentGate = new ApprovalGate();
    const current = currentGate.issue(binding, 20_000);
    expect(() => currentGate.consume(current.token, { ...binding, inputs: {} }, 20_001)).toThrow(/no longer current/i);
    expect(emptyProfile.fullName).toBe('');
    expect(emptyProfile.email).toBe('');
  });

  it('does not retry an unclear mutation and rejects a duplicate submit', async () => {
    const offers = demoOffers('event', 'http://127.0.0.1:4000');
    let posts = 0;
    let releasePost!: () => void;
    let failPost!: () => void;
    const postStarted = new Promise<void>((resolve) => { releasePost = resolve; });
    const postResponse = new Promise<void>((_resolve, reject) => { failPost = () => reject(new Error('connection lost after POST')); });
    const fakeBrowser = {
      fixtureOrigin: 'http://127.0.0.1:4000', sessionId: 'session-1',
      readOffers: async (kind: TaskKind) => offers.filter((offer) => offer.kind === kind),
      ownsSession: (id: string) => id === 'session-1',
      submitPrepared: async () => { posts += 1; releasePost(); await postResponse; return {}; },
      checkResult: async () => false,
      checkCurrentResult: async () => null,
    } as unknown as BrowserSession;
    const broker = new ToolBroker(fakeBrowser, new ApprovalGate());
    const prepared = await broker.prepare(offers[0], 2, {
      ...emptyProfile, fullName: 'Jordan Example', email: 'jordan@example.test',
    });

    const submitting = broker.submit(prepared.approval.token, prepared.binding);
    await postStarted;
    broker.stop();
    await expect(broker.submit(prepared.approval.token, prepared.binding)).rejects.toThrow(/already in progress|no longer current/i);
    failPost();
    await expect(submitting).resolves.toMatchObject({ state: 'unclear' });
    expect(posts).toBe(1);
  });

  it('prevents a prepared action from posting after stop', async () => {
    const offers = demoOffers('event', 'http://127.0.0.1:4000');
    let posts = 0;
    const fakeBrowser = {
      fixtureOrigin: 'http://127.0.0.1:4000', sessionId: 'session-2',
      readOffers: async (kind: TaskKind) => offers.filter((offer) => offer.kind === kind),
      ownsSession: (id: string) => id === 'session-2',
      submitPrepared: async () => { posts += 1; return { reference: 'DEMO-1' }; },
      checkResult: async () => true,
    } as unknown as BrowserSession;
    const broker = new ToolBroker(fakeBrowser, new ApprovalGate());
    const prepared = await broker.prepare(offers[0], 4, { ...emptyProfile, fullName: 'Jordan Example', email: 'jordan@example.test' });
    broker.stop();
    await expect(broker.submit(prepared.approval.token, prepared.binding)).rejects.toThrow(/stopped/i);
    expect(posts).toBe(0);
  });
});
