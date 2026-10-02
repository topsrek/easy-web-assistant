import { describe, expect, it, vi } from 'vitest';
import type { Offer } from '../shared/schema.js';
import { leisureProvider, normalizeLeisureOffer } from '../server/providers/leisure.js';

const sourceUrl = 'http://127.0.0.1:3001/fixture/leisure';

function fixture(overrides: Partial<Offer> = {}): Offer {
  return {
    id: 'fictional-pottery-course',
    kind: 'leisure',
    title: 'Test Community Centre Pottery Course',
    provider: 'Test Community Centre',
    subtitle: 'Fictional weekly beginner course',
    price: null,
    currency: 'USD',
    priceLabel: 'Course fee not stated',
    unknownCosts: [],
    facts: [
      { label: 'Category', value: 'Course', sourceUrl, completeness: 'complete' },
      { label: 'Venue', value: 'Studio 2, Test Community Centre', sourceUrl, completeness: 'complete' },
      { label: 'Address', value: '10 Example Lane, Sampletown, CA 90000', sourceUrl, completeness: 'complete' },
      { label: 'Schedule type', value: 'Six weekly sessions', sourceUrl, completeness: 'complete' },
      { label: 'Schedule', value: 'Tuesdays, 6:00–8:00 PM, October 6–November 10, 2026; America/Los_Angeles', sourceUrl, completeness: 'complete' },
      { label: 'Time zone', value: 'America/Los_Angeles', sourceUrl, completeness: 'complete' },
      { label: 'Availability', value: 'Places subject to confirmation by the centre', sourceUrl, completeness: 'partial' },
    ],
    details: [
      { title: 'Prerequisites', text: 'No experience required. Participants must be at least 16.', sourceUrl, completeness: 'complete' },
      { title: 'Materials', text: 'Clay and firing charges are not stated; ask the centre.', sourceUrl, completeness: 'partial' },
      { title: 'Membership', text: 'No membership requirement is stated.', sourceUrl, completeness: 'partial' },
      { title: 'Access', text: 'Step-free entrance; studio access details need confirmation.', sourceUrl, completeness: 'partial' },
      { title: 'Cancellation and transfer', text: 'Cancellation and transfer conditions are not stated.', sourceUrl, completeness: 'unknown' },
    ],
    images: [{ url: `${sourceUrl}/images/studio.jpg`, alt: 'Original fictional test studio image', sourceUrl }],
    sourceUrl,
    observedAt: '2026-10-02T20:00:00.000Z',
    demo: true,
    selectLabel: 'Review test enrollment request',
    completeness: 'partial',
    ...overrides,
  };
}

describe('leisure provider', () => {
  it('preserves fictional offer facts, detail conditions, source provenance, images and input immutability', () => {
    const input = fixture();
    const before = structuredClone(input);
    const result = normalizeLeisureOffer(input);

    expect(input).toEqual(before);
    expect(result.facts.find(item => item.label === 'Schedule')?.value).toContain('October 6–November 10, 2026');
    expect(result.facts.find(item => item.label === 'Occurrence pattern')?.value).toBe('Six weekly sessions');
    expect(result.facts.find(item => item.label === 'Participation prerequisites')?.value).toContain('at least 16');
    expect(result.facts.find(item => item.label === 'Availability')?.completeness).toBe('partial');
    expect(result.facts.find(item => item.label === 'Materials and equipment')?.value).toContain('not stated');
    expect(result.facts.find(item => item.label === 'Cancellation')?.value).toContain('not stated');
    expect(result.details.map(item => item.text)).toContain('Clay and firing charges are not stated; ask the centre.');
    expect(result.images).toEqual(input.images);
    expect(result.facts.every(item => item.sourceUrl === sourceUrl)).toBe(true);
    expect(result.unknownCosts.join(' ')).toMatch(/cost|fees|materials|membership/i);
    expect(result.facts.find(item => item.label === 'Search limitations')?.value).toContain('have not been verified as a match');
  });

  it('keeps an unknown fee unknown and does not turn a listed amount into a total', () => {
    const result = normalizeLeisureOffer(fixture({ price: 25, priceLabel: '$25 course fee' }));
    expect(result.facts.find(item => item.label === 'Listed cost')?.value).toContain('does not establish that this is the complete cost');
    expect(result.facts.find(item => item.label === 'Additional fees and total cost')?.value).toContain('Unknown');
    expect(result.unknownCosts.length).toBeGreaterThan(0);
  });

  it('adds explicit Unknown values for missing mandatory source information', () => {
    const result = normalizeLeisureOffer(fixture({ facts: [], details: [], images: [] }));
    for (const label of ['Category', 'Venue', 'Address', 'Full schedule', 'Time zone', 'Participation prerequisites', 'Availability', 'Materials and equipment', 'Membership conditions', 'Access information', 'Cancellation', 'Transfer or attendee changes']) {
      expect(result.facts.find(item => item.label === label)?.value).toMatch(/^Unknown/);
    }
    expect(result.facts.find(item => item.label === 'Original images')?.value).toMatch(/^Unknown/);
  });

  it('normalizes the controller leisure fixture labels without discarding its schedule or prerequisites', () => {
    const result = normalizeLeisureOffer(fixture({
      facts: [
        { label: 'Venue & address', value: '8 Example Lane · Fictional Test District', sourceUrl, completeness: 'complete' },
        { label: 'Schedule', value: 'Six Tuesdays starting October 13 · 6:00–7:30 PM · Year and time zone unknown', sourceUrl, completeness: 'partial' },
        { label: 'Participation requirements', value: 'Beginner friendly; any other prerequisites are unknown', sourceUrl, completeness: 'partial' },
        { label: 'Capacity & availability', value: 'Unknown; this is not a live seat count', sourceUrl, completeness: 'unknown' },
      ],
    }));
    expect(result.facts.find(item => item.label === 'Address')?.value).toBe('8 Example Lane · Fictional Test District');
    expect(result.facts.find(item => item.label === 'Full schedule')?.value).toContain('Six Tuesdays starting October 13');
    expect(result.facts.find(item => item.label === 'Occurrence pattern')?.value).toMatch(/multiple or recurring sessions/i);
    expect(result.facts.find(item => item.label === 'Participation prerequisites')?.value).toContain('Beginner friendly');
    expect(result.facts.find(item => item.label === 'Availability')?.value).toContain('not a live seat count');
  });

  it('rejects the wrong kind, non-demo sources, unsafe URLs and mixed origins', () => {
    expect(() => normalizeLeisureOffer(fixture({ kind: 'event' }))).toThrow(/leisure/i);
    expect(() => normalizeLeisureOffer(fixture({ sourceUrl: 'https://example.org/fixture/leisure' }))).toThrow(/controlled fictional test website/i);
    expect(() => normalizeLeisureOffer(fixture({ sourceUrl: 'http://user:pass@127.0.0.1:3001/fixture/leisure' }))).toThrow(/controlled fictional test website/i);
    expect(() => normalizeLeisureOffer(fixture({ images: [{ url: 'https://images.example/studio.jpg', alt: 'External', sourceUrl: 'https://images.example/studio.jpg' }] }))).toThrow(/different source origin/i);
    expect(() => normalizeLeisureOffer(fixture({ demo: false }))).toThrow(/controlled fictional test website/i);
  });

  it('searches only leisure offers and declares the minimal fictional request data and safe action meaning', async () => {
    const readOffers = vi.fn(async () => [fixture()]);
    const result = await leisureProvider.search({ readOffers }, 'find a course on a requested date');
    expect(readOffers).toHaveBeenCalledWith('leisure');
    expect(result).toHaveLength(1);
    expect(leisureProvider.requiredFields).toEqual(['fullName', 'email']);
    expect(leisureProvider.kind).toBe('leisure');
    expect(leisureProvider.actionLabel).toBe('Submit test enrollment request');
    expect(leisureProvider.consequences.join(' ')).toMatch(/no real activity is booked/i);
    expect(leisureProvider.consequences.join(' ')).toMatch(/does not confirm enrollment or participation/i);
    expect('submit' in leisureProvider).toBe(false);
    expect('finalize' in leisureProvider).toBe(false);
  });
});
