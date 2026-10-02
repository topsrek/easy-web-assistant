import { describe, expect, it } from 'vitest';
import { demoOffers } from '../server/demo.js';
import { normalizeServiceOffer, serviceProvider } from '../server/providers/services.js';
import type { Offer } from '../shared/schema.js';

const serviceFixture = (): Offer => ({
  id: 'service-repair-test',
  kind: 'service',
  title: 'Test Home Services — tap repair inquiry',
  provider: 'Test Home Services (fictional)',
  subtitle: 'Fictional demo listing for a repair request; no live contractor is represented.',
  price: null,
  currency: 'USD',
  priceLabel: 'No verified total',
  unknownCosts: ['Labour and final price are not provided.'],
  facts: [
    { label: 'Service', value: 'Tap repair; household plumbing demonstration', completeness: 'complete' },
    { label: 'Service area', value: 'Demo area only; exact coverage not supplied', completeness: 'partial' },
    { label: 'Time window', value: 'Weekday request window; exact date and availability unknown', completeness: 'partial' },
    { label: 'Time zone', value: 'Unknown — not provided by this source.', completeness: 'unknown' },
    { label: 'Visit type', value: 'Home visit requested; address collection requirement has not been verified', completeness: 'partial' },
    { label: 'Price basis', value: 'Estimate after assessment; not a quote', completeness: 'partial' },
    { label: 'Call-out', value: 'Unknown — not provided by this source.', completeness: 'unknown' },
    { label: 'Materials', value: 'Parts may be needed; cost unknown', completeness: 'partial' },
  ],
  details: [
    { title: 'Fictional provider information', text: 'This is a fictional local test provider listing, not a real service company.', completeness: 'complete' },
    { title: 'Prerequisites', text: 'Describe the issue in the request. No source-verified qualification or appointment is listed.', completeness: 'partial' },
    { title: 'Cancellation', text: 'Cancellation conditions are not supplied by this fictional listing.', completeness: 'unknown' },
    { title: 'Data use', text: 'The test provider receives only the fields shown in the approval.', completeness: 'complete' },
  ],
  images: [
    { url: 'http://127.0.0.1:3001/fixture/images/test-service.svg', alt: 'Original fictional test service illustration', sourceUrl: 'http://127.0.0.1:3001/fixture/service' },
    { url: 'http://127.0.0.1:3001/fixture/images/toolkit.svg', alt: 'Original fictional toolkit illustration', sourceUrl: 'http://127.0.0.1:3001/fixture/service' },
  ],
  sourceUrl: 'http://127.0.0.1:3001/fixture/service',
  observedAt: '2026-10-02T12:00:00.000Z',
  demo: true,
  selectLabel: 'Review fictional service request',
  completeness: 'partial',
});

describe('serviceProvider', () => {
  it('declares the minimum test fields and a request-only action', () => {
    expect(serviceProvider.kind).toBe('service');
    expect(serviceProvider.requiredFields).toEqual(['fullName', 'email', 'phone']);
    expect(serviceProvider.actionLabel).toBe('Submit test service request');
    expect(serviceProvider.consequences.join(' ')).toMatch(/no real contractor is engaged/i);
    expect(serviceProvider).not.toHaveProperty('submit');
    expect(serviceProvider).not.toHaveProperty('finalize');
  });

  it('adds missing service fields as unknown and preserves source material, provenance and images', () => {
    const input = serviceFixture();
    const normalized = normalizeServiceOffer(input);
    const facts = new Map(normalized.facts.map(fact => [fact.label, fact]));
    for (const label of [
      'Service', 'Provider', 'Service area', 'Time window', 'Time zone', 'Visit and location requirements',
      'Prerequisites', 'Qualifications', 'Availability', 'Price basis', 'Labour charge', 'Call-out charge',
      'Travel charge', 'Materials charge', 'Other charges', 'Cancellation conditions', 'Data disclosure',
      'Listed price', 'Total cost', 'Original images', 'Matching limitations',
    ]) expect(facts.get(label), label).toBeDefined();
    expect(facts.get('Qualifications')?.value).toMatch(/^Unknown/);
    expect(facts.get('Availability')?.value).toMatch(/^Unknown/);
    expect(facts.get('Total cost')?.value).toMatch(/^Unknown/);
    expect(normalized.price).toBeNull();
    expect(normalized.unknownCosts.join(' ')).toMatch(/complete service total is unknown/i);
    expect(normalized.images).toEqual(input.images);
    expect(normalized.facts.some(fact => fact.label === 'Service' && fact.value === 'Tap repair; household plumbing demonstration')).toBe(true);
    expect(normalized.details.some(detail => detail.title === 'Cancellation' && /not supplied/.test(detail.text))).toBe(true);
    expect(normalized.facts.every(fact => fact.sourceUrl === input.sourceUrl)).toBe(true);
    expect(normalized.completeness).toBe('partial');
    expect(input.facts).toHaveLength(8);
  });

  it('uses separate fictional inputs for household help and tradesperson requests', () => {
    const householdHelp = serviceFixture();
    householdHelp.id = 'service-household-help-test';
    householdHelp.title = 'Test Home Services — household help inquiry';
    householdHelp.facts = householdHelp.facts.map(fact => fact.label === 'Service'
      ? { ...fact, value: 'Fictional household help request; tasks to be described' }
      : fact);
    const tradesperson = serviceFixture();
    tradesperson.id = 'service-tradesperson-test';
    tradesperson.title = 'Test Home Services — tradesperson inquiry';
    tradesperson.facts = tradesperson.facts.map(fact => fact.label === 'Service'
      ? { ...fact, value: 'Fictional general tradesperson inquiry; qualification unknown' }
      : fact);

    expect(normalizeServiceOffer(householdHelp).facts.find(fact => fact.label === 'Service')?.value).toMatch(/household help/i);
    expect(normalizeServiceOffer(tradesperson).facts.find(fact => fact.label === 'Service')?.value).toMatch(/tradesperson/i);
  });

  it('normalizes the Controller-owned service fixture without losing its request and cost evidence', () => {
    const source = demoOffers('service', 'http://127.0.0.1:3001')[0];
    const normalized = normalizeServiceOffer(source);
    const facts = new Map(normalized.facts.map(fact => [fact.label, fact.value]));
    expect(facts.get('Service')).toBe('Small household repair assessment');
    expect(facts.get('Visit and location requirements')).toMatch(/address collection is not part of this fixture/i);
    expect(facts.get('Qualifications')).toMatch(/^Unknown/i);
    expect(facts.get('Availability')).toMatch(/^Unknown/i);
    expect(facts.get('Total cost')).toMatch(/^Unknown/i);
    expect(facts.get('Request vs engagement')).toMatch(/no contractor is engaged/i);
    expect(facts.get('Confirmation evidence')).toMatch(/test request receipt only/i);
    expect(normalized.unknownCosts).toContain('Labour, call-out, travel, materials and total are unknown');
    expect(normalized.details.find(detail => detail.title === 'Request conditions')?.text).toMatch(/does not accept a quote or hire a contractor/i);
  });

  it('never treats a listed component as the complete service total', () => {
    const normalized = normalizeServiceOffer({
      ...serviceFixture(), price: 45, priceLabel: '$45 call-out component', unknownCosts: [],
      facts: [...serviceFixture().facts, { label: 'Labour', value: '$45 call-out charge only', completeness: 'complete' }],
    });
    expect(normalized.price).toBe(45);
    expect(normalized.facts.find(fact => fact.label === 'Listed price')?.value).toMatch(/not a verified total/i);
    expect(normalized.facts.find(fact => fact.label === 'Total cost')?.completeness).toBe('unknown');
    expect(normalized.unknownCosts.join(' ')).toMatch(/complete service total is unknown/i);
  });

  it('keeps all offer information, including distinct conditions and original image variants', () => {
    const input = serviceFixture();
    input.details.push({ title: 'Materials and access', text: 'A replacement part may be required; the entry route is not checked.', completeness: 'partial' });
    const normalized = normalizeServiceOffer(input);
    expect(normalized.details).toContainEqual(expect.objectContaining({ title: 'Materials and access', text: 'A replacement part may be required; the entry route is not checked.' }));
    expect(normalized.images).toEqual(input.images);
    expect(normalized.facts.find(fact => fact.label === 'Materials')?.value).toMatch(/cost unknown/i);
  });

  it('states that request receipt is not a confirmed engagement or visit and limits address transfer', () => {
    const normalized = normalizeServiceOffer(serviceFixture());
    const outcome = normalized.details.find(detail => detail.title === 'Request outcome')?.text ?? '';
    const disclosure = normalized.details.find(detail => detail.title === 'Data minimization')?.text ?? '';
    expect(outcome).toMatch(/does not hire a real contractor/i);
    expect(outcome).toMatch(/does not .*confirm.*visit/i);
    expect(disclosure).toMatch(/street address is only needed when the source verifies/i);
    expect(disclosure).toMatch(/current approval/i);
    expect(serviceProvider.requiredFields).not.toContain('street');
  });

  it('rejects wrong kinds, non-demo sources, unsafe external URLs and mixed origins', async () => {
    expect(() => normalizeServiceOffer({ ...serviceFixture(), kind: 'event' })).toThrow(/service/i);
    expect(() => normalizeServiceOffer({ ...serviceFixture(), demo: false })).toThrow(/controlled/i);
    expect(() => normalizeServiceOffer({ ...serviceFixture(), sourceUrl: 'https://contractor.example/services' })).toThrow(/controlled/i);
    expect(() => normalizeServiceOffer({ ...serviceFixture(), sourceUrl: 'http://user:pass@127.0.0.1:3001/fixture/service' })).toThrow(/controlled/i);
    expect(() => normalizeServiceOffer({
      ...serviceFixture(), images: [{ url: 'https://external.example/photo.jpg', alt: 'External', sourceUrl: 'http://127.0.0.1:3001/fixture/service' }],
    })).toThrow(/different source origin/i);

    await expect(serviceProvider.search({ readOffers: async () => [
      serviceFixture(),
      {
        ...serviceFixture(),
        sourceUrl: 'http://127.0.0.1:3002/fixture/service',
        images: serviceFixture().images.map(image => ({
          ...image,
          url: image.url.replace(':3001/', ':3002/'),
          sourceUrl: 'http://127.0.0.1:3002/fixture/service',
        })),
      },
    ] }, 'repair')).rejects.toThrow(/different website origins/i);
  });

  it('labels requested places and dates unmatched when a fixed listing cannot verify them', async () => {
    const offers = await serviceProvider.search({ readOffers: async () => [serviceFixture()] }, 'Request a plumber in Berlin tomorrow at 9 AM');
    expect(offers).toHaveLength(1);
    expect(offers[0].facts.find(fact => fact.label === 'Matching limitations')?.value).toMatch(/not been verified as a match/i);
    expect(offers[0].facts.find(fact => fact.label === 'Requested constraints')?.completeness).toBe('partial');
    expect(offers[0].details.find(detail => detail.title === 'Fixed demo matching limitations')?.text).toMatch(/not a live contractor search/i);
  });
});
