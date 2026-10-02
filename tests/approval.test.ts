import { describe, expect, it } from 'vitest';
import { ApprovalGate, detailsFor, type ApprovalBinding } from '../server/approval.js';
import { emptyProfile } from '../shared/schema.js';

const binding = (): ApprovalBinding => ({
  action: 'book', site: 'http://127.0.0.1:3001', offerId: 'event-1',
  inputs: { Email: 'ada@example.test', 'Full name': 'Ada Lovelace' },
  amounts: { price: 70, currency: 'USD', unknownCosts: ['Fees unknown'] }, version: 4,
});

describe('ApprovalGate', () => {
  it('issues a digest-bound approval and consumes it only once', () => {
    const gate = new ApprovalGate();
    const issued = gate.issue(binding(), 1000);
    expect(issued).toMatchObject({ version: 4, offerId: 'event-1', expiresAt: 301000 });
    expect(issued.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(gate.consume(issued.token, binding(), 1001).digest).toBe(issued.digest);
    expect(() => gate.consume(issued.token, binding(), 1002)).toThrow(/no longer current/i);
  });

  it('rejects forged token, stale version, expiry and invalidation', () => {
    const gate = new ApprovalGate();
    const issued = gate.issue(binding(), 1000);
    expect(() => gate.consume('forged', binding(), 1001)).toThrow();
    expect(() => gate.consume(issued.token, { ...binding(), version: 3 }, 1001)).toThrow();
    expect(() => gate.consume(issued.token, binding(), issued.expiresAt)).toThrow();
    const current = gate.issue(binding(), 1000);
    gate.invalidate();
    expect(() => gate.consume(current.token, binding(), 1001)).toThrow();
  });

  it.each([
    ['action', (b: ApprovalBinding) => { b.action = 'cancel'; }],
    ['site', (b: ApprovalBinding) => { b.site = 'http://127.0.0.1:3002'; }],
    ['offer', (b: ApprovalBinding) => { b.offerId = 'event-2'; }],
    ['input', (b: ApprovalBinding) => { b.inputs.Email = 'other@example.test'; }],
    ['amount', (b: ApprovalBinding) => { b.amounts.price = 71; }],
    ['currency', (b: ApprovalBinding) => { b.amounts.currency = 'EUR'; }],
    ['unknown cost', (b: ApprovalBinding) => { b.amounts.unknownCosts = []; }],
    ['version', (b: ApprovalBinding) => { b.version += 1; }],
  ])('rejects a changed %s', (_label, mutate) => {
    const gate = new ApprovalGate();
    const issued = gate.issue(binding());
    const altered = binding(); mutate(altered);
    expect(() => gate.consume(issued.token, altered)).toThrow(/no longer current/i);
  });

  it('makes concurrent consumes single-use', async () => {
    const gate = new ApprovalGate();
    const issued = gate.issue(binding());
    const results = await Promise.allSettled([
      Promise.resolve().then(() => gate.consume(issued.token, binding())),
      Promise.resolve().then(() => gate.consume(issued.token, binding())),
    ]);
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(1);
  });

  it('projects only the website fields required by each flow', () => {
    const profile = { ...emptyProfile, fullName: 'Ada Lovelace', email: 'ada@example.test', phone: '555-0100',
      accessNeeds: 'Step free', street: '1 Private Street', city: 'Example', postalCode: '12345' };
    expect(detailsFor('event', profile)).toEqual({ 'Full name': 'Ada Lovelace', Email: 'ada@example.test' });
    expect(detailsFor('government', profile)).toEqual({ 'Full name': 'Ada Lovelace', Email: 'ada@example.test' });
    expect(detailsFor('service', profile)).toEqual({ 'Full name': 'Ada Lovelace', Email: 'ada@example.test', Phone: '555-0100' });
    expect(detailsFor('appointment', profile)).toEqual({ 'Full name': 'Ada Lovelace', Email: 'ada@example.test', Phone: '555-0100', 'Access needs': 'Step free' });
    expect(JSON.stringify(detailsFor('service', profile))).not.toContain('Private Street');
  });
});
