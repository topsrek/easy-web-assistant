import { describe, expect, it } from 'vitest';
import { demoOffers } from '../server/demo.js';
import { eventProvider, normalizeEventOffer } from '../server/providers/events.js';
import { offerSchema, type Offer } from '../shared/schema.js';

const source = 'http://127.0.0.1:3001';

describe('eventProvider', () => {
  it('validates readOffers, preserves source material, and explicitly fills mandatory unknowns', async () => {
    const fixture = demoOffers('event', source)[0];
    const provenanceSource = `${source}/terms/events`;
    const original = {
      ...fixture,
      facts: fixture.facts.map((fact, index) => index === 0 ? { ...fact, sourceUrl: provenanceSource } : fact),
      details: fixture.details.map((detail, index) => index === 0 ? { ...detail, sourceUrl: provenanceSource } : detail),
    };
    const found = await eventProvider.search({ readOffers: async () => [original] }, 'Find an event');

    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ sourceUrl: original.sourceUrl, images: original.images, provider: original.provider });
    for (const fact of original.facts) {
      expect(found[0].facts).toContainEqual(expect.objectContaining({ label: fact.label, value: fact.value }));
    }
    for (const detail of original.details) {
      expect(found[0].details).toContainEqual(expect.objectContaining({ title: detail.title, text: detail.text }));
    }
    expect(found[0].facts[0].sourceUrl).toBe(provenanceSource);
    expect(found[0].details[0].sourceUrl).toBe(provenanceSource);
    expect(found[0].facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Event date', value: expect.stringContaining('November 14 (year unknown)'), completeness: 'partial' }),
      expect.objectContaining({ label: 'Event time and time zone', value: '7:30 PM · time zone unknown', completeness: 'partial' }),
      expect.objectContaining({ label: 'Ticket categories', value: 'Standard seating (other available categories are not established)', completeness: 'partial' }),
      expect.objectContaining({ label: 'Ticket quantity', value: expect.stringContaining('2') }),
      expect.objectContaining({ label: 'Price per ticket', value: '$35 per ticket (as stated in source breakdown)' }),
      expect.objectContaining({ label: 'Seats', value: 'Allocated seating; exact seat assignment is not provided.' }),
      expect.objectContaining({ label: 'Availability', value: expect.stringContaining('Unknown'), completeness: 'unknown' }),
      expect.objectContaining({ label: 'Cancellation conditions', value: expect.stringContaining('not provided by this source'), completeness: 'unknown' }),
      expect.objectContaining({ label: 'Transfer conditions', value: expect.stringContaining('not provided by this source'), completeness: 'unknown' }),
    ]));
    expect(found[0].details.find(({ title }) => title === 'Event matching limitations')?.text).toContain('fixed fictional test listing');
  });

  it('does not turn unknown fees into zero or the $70 ticket subtotal into a confirmed total', async () => {
    const [fixture] = demoOffers('event', source);
    const [offer] = await eventProvider.search({ readOffers: async () => [fixture] }, 'Find an event');

    expect(offer.price).toBe(70);
    expect(offer.priceLabel).toContain('2 tickets');
    expect(offer.unknownCosts).toContain('Booking fees are not confirmed');
    expect(offer.facts).toContainEqual(expect.objectContaining({ label: 'Confirmed total', value: expect.stringContaining('not provided by this source'), completeness: 'unknown' }));
    expect(offer.facts).toContainEqual(expect.objectContaining({ label: 'Fees', value: expect.stringContaining('not provided by this source'), completeness: 'unknown' }));
    expect(eventProvider.consequences.join(' ')).toContain('not a confirmed total');
  });

  it('rejects a requested accessibility condition that the fixed listing cannot verify', async () => {
    const [fixture] = demoOffers('event', source);
    const found = await eventProvider.search({ readOffers: async () => [fixture] }, 'Find wheelchair accessible seating');
    expect(found).toEqual([]);
  });

  it('does not relax an explicit date constraint to fit the fixed demo listing', async () => {
    const [fixture] = demoOffers('event', source);
    const found = await eventProvider.search({ readOffers: async () => [fixture] }, 'Find an event on December 12');
    expect(found).toEqual([]);
  });

  it('rejects a requested place that is not stated by the fixture', async () => {
    const [fixture] = demoOffers('event', source);
    const found = await eventProvider.search({ readOffers: async () => [fixture] }, 'Find an event in Seattle');
    expect(found).toEqual([]);
  });

  it('uses zod validation for provider results', async () => {
    await expect(eventProvider.search({ readOffers: async () => [{ id: 'bad' } as Offer] }, 'Find an event')).rejects.toThrow();
  });

  it('normalizes only event offers', () => {
    const [fixture] = demoOffers('event', source);
    expect(() => normalizeEventOffer({ ...fixture, kind: 'journey' } as Offer)).toThrow(/another kind/i);
  });

  it.each([
    ['external website', (offer: Offer) => ({ ...offer, sourceUrl: 'https://events.example/event' })],
    ['non-demo offer', (offer: Offer) => ({ ...offer, demo: false })],
    ['external fact', (offer: Offer) => ({ ...offer, facts: offer.facts.map((fact, index) => index === 0 ? { ...fact, sourceUrl: 'https://events.example/fact' } : fact) })],
    ['external detail', (offer: Offer) => ({ ...offer, details: offer.details.map((detail, index) => index === 0 ? { ...detail, sourceUrl: 'https://events.example/detail' } : detail) })],
    ['external image', (offer: Offer) => ({ ...offer, images: [{ url: 'https://events.example/image.jpg', sourceUrl: 'https://events.example/image.jpg', alt: 'External image' }] })],
  ])('rejects %s instead of accepting it as a controlled event fixture', async (_label, mutate) => {
    const [fixture] = demoOffers('event', source);
    const invalid = mutate(fixture);
    await expect(eventProvider.search({ readOffers: async () => [invalid] }, 'Find an event')).rejects.toThrow(/event|origin/i);
  });

  it('does not add unknown fee costs when source facts verify fees and total', async () => {
    const [fixture] = demoOffers('event', source);
    const knownCosts = offerSchema.parse({
      ...fixture,
      completeness: 'partial',
      unknownCosts: [],
      facts: [
        ...fixture.facts,
        { label: 'Fees', value: '$0; included in ticket amount', sourceUrl: fixture.sourceUrl, completeness: 'complete' },
        { label: 'Confirmed total', value: '$70 USD for two tickets', sourceUrl: fixture.sourceUrl, completeness: 'complete' },
      ],
      details: fixture.details.map((detail) => detail.title === 'Price breakdown'
        ? { ...detail, text: 'Two tickets; all fees included. Confirmed total $70.', completeness: 'complete' }
        : detail),
    });
    const [offer] = await eventProvider.search({ readOffers: async () => [knownCosts] }, 'Find an event');

    expect(offer.unknownCosts).toEqual([]);
    expect(offer.facts).toContainEqual(expect.objectContaining({ label: 'Fees', value: '$0; included in ticket amount', sourceUrl: fixture.sourceUrl }));
    expect(offer.facts).toContainEqual(expect.objectContaining({ label: 'Confirmed total', value: '$70 USD for two tickets', sourceUrl: fixture.sourceUrl }));
  });
});
