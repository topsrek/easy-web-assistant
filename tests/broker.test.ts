import { describe, expect, it, vi } from 'vitest';
import { ApprovalGate } from '../server/approval.js';
import { BrowserSession } from '../server/browser.js';
import { ToolBroker } from '../server/broker.js';
import { emptyProfile, type Offer } from '../shared/schema.js';

const offer: Offer = {
  id: 'event-jazz', kind: 'event', title: 'An evening of jazz', provider: 'Demo Arts Hall', subtitle: 'Music',
  price: 70, currency: 'USD', priceLabel: '$70 for 2 tickets', unknownCosts: ['Fees unknown'],
  facts: [], details: [], images: [], sourceUrl: 'http://127.0.0.1:3001/fixture/event',
  observedAt: '2026-10-02T12:00:00.000Z', demo: true, selectLabel: 'Choose these tickets', completeness: 'complete',
};
const origin = 'http://127.0.0.1:3001';
const create = () => {
  const browser = Object.assign(new BrowserSession(origin, 'session-1'), {
    readOffers: vi.fn<BrowserSession['readOffers']>(async () => [offer]),
    submitPrepared: vi.fn<BrowserSession['submitPrepared']>(async () => ({})),
    checkResult: vi.fn<BrowserSession['checkResult']>(async () => true),
    checkCurrentResult: vi.fn<BrowserSession['checkCurrentResult']>(async () => null),
  });
  const gate = new ApprovalGate();
  return { browser, gate, broker: new ToolBroker(browser, gate) };
};

describe('ToolBroker', () => {
  it('prepares a narrow binding and requires an exact in-flight one-use capability', async () => {
    const { broker, browser } = create();
    let authorize: ToolBroker['authorizeFixtureSubmission'];
    browser.submitPrepared.mockImplementation(async (binding, capability) => {
      authorize = (broker as ToolBroker).authorizeFixtureSubmission.bind(broker);
      expect(authorize('session-1', 'event-jazz', { 'Full name': 'Ada', Email: 'ada@example.test' }, 'forged', binding.action)).toBe(false);
      expect(authorize('session-1', 'another-offer', binding.inputs, capability, binding.action)).toBe(false);
      expect(authorize('other-session', 'event-jazz', binding.inputs, capability, binding.action)).toBe(false);
      expect(authorize('session-1', 'event-jazz', { Email: 'ada@example.test' }, capability, binding.action)).toBe(false);
      expect(authorize('session-1', 'event-jazz', binding.inputs, capability, 'test_service_request')).toBe(false);
      expect(authorize('session-1', 'event-jazz', binding.inputs, capability, binding.action)).toBe(true);
      expect(authorize('session-1', 'event-jazz', binding.inputs, capability, binding.action)).toBe(false);
      return { reference: 'DEMO-1234', outcome: 'booking_confirmed' as const };
    });
    const prepared = await broker.prepare(offer, 2, { ...emptyProfile, fullName: 'Ada', email: 'ada@example.test' });
    expect(prepared.binding).toMatchObject({ action: 'test_booking', site: origin, offerId: offer.id, version: 2,
      inputs: { 'Full name': 'Ada', Email: 'ada@example.test' }, amounts: { price: 70, currency: 'USD', unknownCosts: ['Fees unknown'] } });
    expect(prepared.transmittedFields.map(({ label }) => label)).toEqual(['Full name', 'Email']);
    expect(JSON.stringify(prepared)).not.toContain('capability');
    await expect(broker.submit(prepared.approval.token, prepared.binding)).resolves.toEqual({ state: 'confirmed', reference: 'DEMO-1234', outcome: 'booking_confirmed' });
    expect(browser.submitPrepared).toHaveBeenCalledTimes(1);
    expect(browser.checkResult).toHaveBeenCalledTimes(1);
  });

  it('blocks a stopped prepared action before any submission', async () => {
    const { broker, browser } = create();
    const prepared = await broker.prepare(offer, 0, emptyProfile);
    broker.stop();
    await expect(broker.submit(prepared.approval.token, prepared.binding)).rejects.toThrow(/stopped/i);
    expect(browser.submitPrepared).not.toHaveBeenCalled();
  });

  it('invalidates approvals on reset and then accepts a newly prepared action', async () => {
    const { broker, browser } = create();
    const old = await broker.prepare(offer, 0, emptyProfile);
    await broker.reset();
    await expect(broker.submit(old.approval.token, old.binding)).rejects.toThrow(/no longer current/i);
    const current = await broker.prepare(offer, 1, emptyProfile);
    browser.submitPrepared.mockResolvedValue({ reference: 'DEMO-RESET', outcome: 'booking_confirmed' });
    await expect(broker.submit(current.approval.token, current.binding)).resolves.toMatchObject({ state: 'confirmed', reference: 'DEMO-RESET' });
    expect(browser.submitPrepared).toHaveBeenCalledTimes(1);
  });

  it('locks concurrent mutations and verifies provider state after a post-submit stop', async () => {
    const { broker, browser } = create();
    type Receipt = Awaited<ReturnType<BrowserSession['submitPrepared']>>;
    let finish!: (value: Receipt) => void;
    browser.submitPrepared.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const prepared = await broker.prepare(offer, 1, emptyProfile);
    const first = broker.submit(prepared.approval.token, prepared.binding);
    await expect(broker.submit(prepared.approval.token, prepared.binding)).rejects.toThrow(/already in progress/i);
    broker.stop();
    finish({ reference: 'DEMO-STOPPED', outcome: 'booking_confirmed' });
    await expect(first).resolves.toEqual({ state: 'confirmed', reference: 'DEMO-STOPPED', outcome: 'booking_confirmed' });
    expect(browser.checkResult).toHaveBeenCalledTimes(1);
    expect(browser.submitPrepared).toHaveBeenCalledTimes(1);
  });

  it('does not mistake a prior confirmed operation for the current unclear action', async () => {
    const { broker, browser } = create();
    browser.submitPrepared.mockRejectedValue(new Error('connection dropped after POST'));
    const priorCapability = 'previous-operation-token';
    browser.checkCurrentResult.mockImplementation(async (_binding, capability) => capability === priorCapability
      ? { reference: 'DEMO-OLD', outcome: 'booking_confirmed' } : null);
    const prepared = await broker.prepare(offer, 1, emptyProfile);
    await expect(broker.submit(prepared.approval.token, prepared.binding)).resolves.toEqual({ state: 'unclear' });
    expect(browser.submitPrepared).toHaveBeenCalledTimes(1);
    expect(browser.checkCurrentResult).toHaveBeenCalledTimes(1);
    expect(browser.checkCurrentResult.mock.calls[0]?.[1]).not.toBe(priorCapability);
  });

  it('uses the contract action allowlist and provider-authored approval label for all six flows', async () => {
    const { broker, browser } = create();
    const cases = [
      ['event', 'test_booking'], ['journey', 'test_booking'], ['appointment', 'test_booking'],
      ['government', 'test_appointment_request'], ['service', 'test_service_request'], ['leisure', 'test_enrollment_request'],
    ] as const;
    for (const [kind, action] of cases) {
      const selected = { ...offer, kind, sourceUrl: `${origin}/fixture/${kind}` } as Offer;
      browser.readOffers.mockResolvedValue([selected]);
      const prepared = await broker.prepare(selected, 3, emptyProfile, {
        actionLabel: 'Provider-authored approval label', consequences: ['Provider-authored consequence.'],
      });
      expect(prepared.binding.action).toBe(action);
      expect(prepared.actionLabel).toBe('Provider-authored approval label');
      expect(prepared.consequences).toEqual(['Provider-authored consequence.']);
    }
  });

  it('checks read-only provider state after a lost POST response without retrying', async () => {
    const { broker, browser } = create();
    browser.submitPrepared.mockRejectedValue(new Error('response lost after fixture mutation'));
    browser.checkCurrentResult.mockResolvedValue({ reference: 'DEMO-RECOVERED', outcome: 'booking_confirmed' });
    const prepared = await broker.prepare(offer, 1, emptyProfile);
    await expect(broker.submit(prepared.approval.token, prepared.binding)).resolves.toEqual({
      state: 'confirmed', reference: 'DEMO-RECOVERED', outcome: 'booking_confirmed',
    });
    expect(browser.submitPrepared).toHaveBeenCalledTimes(1);
    expect(browser.checkCurrentResult).toHaveBeenCalledTimes(1);
    expect(browser.checkCurrentResult.mock.calls[0]?.[1]).toEqual(expect.any(String));
  });

  it('rejects an offer whose current fixture amount changed before preparation', async () => {
    const { broker, browser } = create();
    browser.readOffers.mockResolvedValue([{ ...offer, price: 71 }]);
    await expect(broker.prepare(offer, 1, emptyProfile)).rejects.toThrow(/no longer current/i);
  });

  it('uses provider action text and rejects stop during the asynchronous preparation read', async () => {
    const { broker, browser } = create();
    let finishRead!: (value: Offer[]) => void;
    browser.readOffers.mockImplementation(() => new Promise((resolve) => { finishRead = resolve; }));
    const pending = broker.prepare(offer, 1, emptyProfile, {
      actionLabel: 'Confirm test booking', consequences: ['A test request will be sent.'],
    });
    broker.stop();
    finishRead([offer]);
    await expect(pending).rejects.toThrow(/no longer current/i);
    expect(browser.readOffers).toHaveBeenCalledTimes(1);
  });

  it('rejects changed fixture facts and unknown costs', async () => {
    const { broker, browser } = create();
    browser.readOffers.mockResolvedValue([{ ...offer, unknownCosts: ['Fees changed'] }]);
    await expect(broker.prepare(offer, 1, emptyProfile)).rejects.toThrow(/no longer current/i);
    browser.readOffers.mockResolvedValue([{ ...offer, facts: [{ label: 'When', value: 'Changed date', completeness: 'complete' }] }]);
    await expect(broker.prepare(offer, 1, emptyProfile)).rejects.toThrow(/no longer current/i);
  });
});
