import { describe, expect, it } from 'vitest';
import { demoOffers } from '../server/demo.js';
import { journeyProvider, normalizeJourneyOffer } from '../server/providers/journeys.js';
import type { Offer, TaskKind } from '../shared/schema.js';

const source = 'http://127.0.0.1:3001';
const offers = demoOffers('journey', source);
const readOffers = async (_kind: TaskKind) => offers;

describe('journeyProvider', () => {
  it('preserves different fares, validity, restrictions, and cancellation terms', async () => {
    const results = await journeyProvider.search({ readOffers }, 'Find a journey');
    const rail = results.find(offer => offer.id === 'journey-direct')!;
    const coach = results.find(offer => offer.id === 'journey-bus')!;

    expect(rail.price).toBe(24);
    expect(coach.price).toBe(16);
    expect(rail.facts.find(item => item.label === 'Journey duration')?.value).toContain('47 minutes');
    expect(coach.facts.find(item => item.label === 'Journey duration')?.value).toContain('1 hour 20 minutes');
    expect(rail.facts.find(item => item.label === 'Train restrictions')?.value).toMatch(/No specific train restriction/i);
    expect(coach.facts.find(item => item.label === 'Train restrictions')?.value).toMatch(/Valid only on the selected services/i);
    expect(rail.facts.find(item => item.label === 'Cancellation')?.value).toMatch(/Refundable/i);
    expect(coach.facts.find(item => item.label === 'Cancellation')?.value).toMatch(/Non-refundable/i);
  });

  it('marks unavailable journey terms unknown and retains the source provenance', () => {
    const normalized = normalizeJourneyOffer(offers[1]);
    const values = new Map(normalized.facts.map(item => [item.label, item.value]));

    for (const label of ['Baggage', 'Discounts', 'Changes']) {
      expect(values.get(label)).toMatch(/^Unknown/);
    }
    for (const item of normalized.facts) expect(item.sourceUrl).toBe(normalized.sourceUrl);
    expect(normalized.facts.find(item => item.label === 'Baggage')?.completeness).toBe('unknown');
    expect(values.get('Seat reservation')).toMatch(/seat included/i);
    expect(values.get('Fees and total price')).toMatch(/No extra fees/i);
    expect(values.get('Intermediate stops')).toMatch(/^Unknown/);
    expect(normalized.sourceUrl).toBe(`${source}/fixture/journey`);
    expect(normalized.details.some(item => item.text.includes(normalized.sourceUrl))).toBe(true);
  });

  it('does not substitute the cheaper coach when a train is requested', async () => {
    const results = await journeyProvider.search({ readOffers }, 'Find me a train');
    expect(results.map(offer => offer.id)).toEqual(['journey-direct']);
  });

  it('returns no verified offer when fixed-demo date or route conflicts with the request', async () => {
    await expect(journeyProvider.search({ readOffers }, 'Train from Example Town to City Central on November 12')).resolves.toEqual([]);
    await expect(journeyProvider.search({ readOffers }, 'Journey from Somewhere Else to City Central')).resolves.toEqual([]);
  });

  it('does not claim access needs that the fixture does not verify', async () => {
    const results = await journeyProvider.search({ readOffers }, 'Find a step-free train with boarding assistance');
    expect(results).toEqual([]);
  });

  it('does not treat a direct service as proof that it has no intermediate stops', async () => {
    const results = await journeyProvider.search({ readOffers }, 'Find a direct train');
    const rail = results.find(offer => offer.id === 'journey-direct')!;
    expect(rail.facts.find(item => item.label === 'Transfers and transfer times')?.value).toMatch(/^0;/);
    expect(rail.facts.find(item => item.label === 'Intermediate stops')?.value).toMatch(/^Unknown/);
  });

  it('rejects unmatched requested class, passenger count, and departure time', async () => {
    await expect(journeyProvider.search({ readOffers }, 'Find a first class train')).resolves.toEqual([]);
    await expect(journeyProvider.search({ readOffers }, 'Find a journey for two adults')).resolves.toEqual([]);
    await expect(journeyProvider.search({ readOffers }, 'Find a train after 10 AM')).resolves.toEqual([]);
    await expect(journeyProvider.search({ readOffers }, 'Find a train at 9:15 AM')).resolves.toMatchObject([{ id: 'journey-direct' }]);
  });

  it('enforces return and refundability requirements from the source terms', async () => {
    const results = await journeyProvider.search({ readOffers }, 'Find a refundable return journey');
    expect(results.map(offer => offer.id)).toEqual(['journey-direct']);
  });

  it('preserves provided per-fact and per-detail sources and validates related origins', () => {
    const input = {
      ...offers[0],
      facts: offers[0].facts.map((item, index) => index === 0 ? { ...item, sourceUrl: `${source}/fixture/fact-source` } : item),
      details: offers[0].details.map((item, index) => index === 0 ? { ...item, sourceUrl: `${source}/fixture/terms-source` } : item),
    } as Offer;
    const normalized = normalizeJourneyOffer(input);
    expect(normalized.facts[0].sourceUrl).toBe(`${source}/fixture/fact-source`);
    expect(normalized.details[0].sourceUrl).toBe(`${source}/fixture/terms-source`);
    expect(() => normalizeJourneyOffer({
      ...offers[0], facts: [{ ...offers[0].facts[0], sourceUrl: 'https://other.example/route' }, ...offers[0].facts.slice(1)],
    })).toThrow(/different source origin/i);
    expect(() => normalizeJourneyOffer({ ...offers[0], sourceUrl: 'http://user:secret@127.0.0.1:3001/fixture/journey' }))
      .toThrow(/controlled journey test website/i);
  });

  it('rejects offers with a wrong kind or untrusted source origin', async () => {
    await expect(journeyProvider.search({ readOffers: async () => demoOffers('event', source) }, 'journey'))
      .rejects.toThrow(/non-journey/i);
    const untrusted = [{ ...offers[0], sourceUrl: 'https://example.com/fixture/journey' }] as Offer[];
    await expect(journeyProvider.search({ readOffers: async () => untrusted }, 'journey'))
      .rejects.toThrow(/outside the controlled/i);
  });
});
