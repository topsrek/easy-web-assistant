import { describe, expect, it } from 'vitest';
import { governmentProvider, normalizeGovernmentOffer } from '../server/providers/government.js';
import { offerSchema } from '../shared/schema.js';

const sourceUrl = 'http://127.0.0.1:3001/fixture/government';

function fictionalOffer(overrides: Record<string, unknown> = {}) {
  const offerSource = typeof overrides.sourceUrl === 'string' ? overrides.sourceUrl : sourceUrl;
  const offerOrigin = new URL(offerSource).origin;
  return {
    id: 'government-test-civic-office',
    kind: 'government',
    title: 'Fictional document review appointment',
    provider: 'Test Civic Office (fictional)',
    subtitle: 'Controlled demo appointment request',
    price: null,
    currency: 'USD',
    priceLabel: 'Fee information not fully provided',
    unknownCosts: ['Any additional processing charges are unknown.'],
    facts: [
      { label: 'Department', value: 'Fictional Records Desk', sourceUrl: offerSource, completeness: 'complete' },
      { label: 'Purpose', value: 'Review a fictional sample form', sourceUrl: offerSource, completeness: 'complete' },
      { label: 'Address', value: '100 Demo Plaza, Example City', sourceUrl: offerSource, completeness: 'complete' },
      { label: 'Appointment format', value: 'In person', sourceUrl: offerSource, completeness: 'complete' },
      { label: 'Date', value: 'October 20', sourceUrl: offerSource, completeness: 'partial' },
      { label: 'Time', value: '10:30 AM', sourceUrl: offerSource, completeness: 'complete' },
      { label: 'Duration', value: '25 minutes', sourceUrl: offerSource, completeness: 'complete' },
      { label: 'Required documents', value: 'Bring the fictional sample notice shown on the test page.', sourceUrl: offerSource, completeness: 'complete' },
      { label: 'Steps', value: 'Choose a slot, review the displayed details, then submit a test request.', sourceUrl: offerSource, completeness: 'complete' },
      { label: 'Cancellation', value: 'Use the test page cancellation link before the demo slot.', sourceUrl: offerSource, completeness: 'complete' },
      { label: 'Changes', value: 'Changes require a new test request.', sourceUrl: offerSource, completeness: 'complete' },
    ],
    details: [
      { title: 'Fictional document note', text: 'The sample notice is invented for this test office and is not a real government requirement.', sourceUrl: offerSource, completeness: 'complete' },
      { title: 'Distinct cancellation condition', text: 'If the request was submitted, cancel it using the separate test page link.', sourceUrl: offerSource, completeness: 'complete' },
    ],
    images: [{ url: `${offerOrigin}/fixture/images/civic-office.svg`, alt: 'Illustration from the fictional Test Civic Office', sourceUrl: offerSource }],
    sourceUrl: offerSource,
    observedAt: '2026-10-02T12:00:00.000Z',
    demo: true,
    selectLabel: 'Review fictional request',
    completeness: 'partial',
    ...overrides,
  };
}

function parsedFictionalOffer(overrides: Record<string, unknown> = {}) {
  return offerSchema.parse(fictionalOffer(overrides));
}

describe('governmentProvider', () => {
  it('reads only government offers and retains original source material', async () => {
    const original = parsedFictionalOffer();
    const offers = await governmentProvider.search({
      async readOffers(kind) {
        expect(kind).toBe('government');
        return [original];
      },
    }, 'test civic appointment');

    expect(offers).toHaveLength(1);
    expect(offers[0].images).toEqual(original.images);
    for (const detail of original.details) {
      expect(offers[0].details).toContainEqual(expect.objectContaining({ title: detail.title, text: detail.text }));
    }
    for (const fact of original.facts) {
      expect(offers[0].facts).toContainEqual(expect.objectContaining({ label: fact.label, value: fact.value }));
    }
    expect(offers[0].facts.find(fact => fact.label === 'Date')?.completeness).toBe('partial');
    expect(offers[0].sourceUrl).toBe(sourceUrl);
    expect(offers[0].observedAt).toBe('2026-10-02T12:00:00.000Z');
  });

  it('marks missing appointment, document, fee, and confirmation facts as unknown', () => {
    const input = fictionalOffer({ facts: [], unknownCosts: [] });
    const offer = normalizeGovernmentOffer(input);
    const facts = new Map(offer.facts.map(fact => [fact.label, fact]));

    for (const label of ['Department', 'Purpose', 'Place / address', 'Appointment format', 'Date', 'Year', 'Time', 'Time zone', 'Duration', 'Access', 'Required documents', 'Prerequisites', 'Steps', 'Fees', 'Total cost', 'Unknown charges', 'Cancellation', 'Changes', 'Request and appointment status', 'Confirmation evidence']) {
      expect(facts.get(label)?.value, label).toMatch(/unknown/i);
      expect(facts.get(label)?.completeness, label).toBe('unknown');
    }
    expect(offer.price).toBeNull();
    expect(offer.unknownCosts.join(' ')).toMatch(/unknown/i);
  });

  it('does not turn one known fee into a verified total', () => {
    const input = fictionalOffer({
      price: 15,
      priceLabel: '$15 sample filing fee',
      unknownCosts: ['Other charges and the total are unknown.'],
      facts: [{ label: 'Fees', value: '$15 sample filing fee', sourceUrl, completeness: 'complete' }],
    });
    const offer = normalizeGovernmentOffer(input);
    expect(offer.price).toBe(15);
    expect(offer.facts.find(fact => fact.label === 'Fees')?.value).toBe('$15 sample filing fee');
    expect(offer.facts.find(fact => fact.label === 'Total cost')?.value).toMatch(/unknown/i);
    expect(offer.unknownCosts.join(' ')).toMatch(/unknown/i);
  });

  it('makes fixed-offer search limitations and request consequences explicit', async () => {
    const [offer] = await governmentProvider.search({ readOffers: async () => [parsedFictionalOffer()] }, 'tomorrow in Berlin, step-free access');
    expect(offer.facts.find(fact => fact.label === 'Search limitations')?.value).toMatch(/not been verified as matched/i);
    expect(offer.details.find(detail => detail.title === 'Fixed demo matching limits')?.text).toMatch(/not live government availability/i);
    expect(offer.facts.find(fact => fact.label === 'Request outcome')?.value).toMatch(/does not confirm an appointment/i);
    expect(governmentProvider.requiredFields).toEqual(['fullName', 'email']);
    expect(governmentProvider.actionLabel).toBe('Submit test appointment request');
    expect(governmentProvider.consequences.join(' ')).toMatch(/no real authority/i);
  });

  it('rejects wrong kinds, external sources, unsafe source URLs, and mixed origins', async () => {
    expect(() => normalizeGovernmentOffer(fictionalOffer({ kind: 'event' }))).toThrow(/government/i);
    expect(() => normalizeGovernmentOffer(fictionalOffer({ demo: false }))).toThrow(/controlled/i);
    expect(() => normalizeGovernmentOffer(fictionalOffer({ sourceUrl: 'https://civic.example/fixture/government' }))).toThrow(/controlled/i);
    expect(() => normalizeGovernmentOffer(fictionalOffer({ sourceUrl: 'http://user@127.0.0.1:3001/fixture/government' }))).toThrow(/controlled/i);
    const mixed = parsedFictionalOffer({ sourceUrl: 'http://127.0.0.1:3002/fixture/government' });
    await expect(governmentProvider.search({ readOffers: async () => [parsedFictionalOffer(), mixed] }, 'test appointment')).rejects.toThrow(/different website origins/i);
  });

  it('rejects mixed origins in facts and images and exposes no finalizer', () => {
    const foreignImage = fictionalOffer({
      images: [{ url: 'https://images.example/civic.jpg', alt: 'External civic office image', sourceUrl }],
    });
    expect(() => normalizeGovernmentOffer(foreignImage)).toThrow(/different source origin/i);
    expect(governmentProvider).not.toHaveProperty('submit');
    expect(governmentProvider).not.toHaveProperty('finalize');
  });
});
