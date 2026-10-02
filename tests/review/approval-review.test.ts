import { describe, expect, it, vi } from 'vitest';
import { ApprovalGate } from '../../server/approval.js';
import { ToolBroker } from '../../server/broker.js';
import { emptyProfile, type Offer } from '../../shared/schema.js';

const origin = 'http://127.0.0.1:3001';
const offer: Offer = {
  id: 'demo-event', kind: 'event', title: 'Demo event', provider: 'Test venue', subtitle: 'Music',
  price: 50, currency: 'USD', priceLabel: '$50', unknownCosts: ['Service fee unknown'], facts: [
    { label: 'Date', value: 'October 10', completeness: 'complete' },
  ], details: [{ title: 'Cancellation', text: 'No refunds', completeness: 'complete' }], images: [],
  sourceUrl: `${origin}/fixture/event`, observedAt: '2026-10-02T12:00:00.000Z', demo: true,
  selectLabel: 'Choose', completeness: 'complete',
};

function brokerWith(current: Offer) {
  const browser = {
    fixtureOrigin: origin, sessionId: 'session-review', ownsSession: (id: string) => id === 'session-review',
    readOffers: vi.fn(async () => [current]), submitPrepared: vi.fn(),
    checkResult: vi.fn(), checkCurrentResult: vi.fn(),
  };
  return new ToolBroker(browser as never, new ApprovalGate());
}

describe('approval review stale source data regressions', () => {
  it('rejects when a previously disclosed unknown fee disappears from the live offer', async () => {
    const broker = brokerWith({ ...offer, unknownCosts: [] });
    await expect(broker.prepare(offer, 1, emptyProfile)).rejects.toThrow(/no longer current/i);
  });

  it('rejects when a disclosed source fact disappears from the live offer', async () => {
    const broker = brokerWith({ ...offer, facts: [] });
    await expect(broker.prepare(offer, 1, emptyProfile)).rejects.toThrow(/no longer current/i);
  });

  it('rejects when a disclosed source detail disappears from the live offer', async () => {
    const broker = brokerWith({ ...offer, details: [] });
    await expect(broker.prepare(offer, 1, emptyProfile)).rejects.toThrow(/no longer current/i);
  });
});
