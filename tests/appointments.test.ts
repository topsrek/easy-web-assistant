import { describe, expect, it } from 'vitest';
import { demoOffers } from '../server/demo.js';
import { appointmentProvider, normalizeAppointmentOffer } from '../server/providers/appointments.js';
import { offerSchema } from '../shared/schema.js';

const baseOffer = () => offerSchema.parse(demoOffers('appointment', 'http://127.0.0.1:3001')[0]);

describe('appointmentProvider', () => {
  it('reads only appointment offers and preserves original content', async () => {
    const sourceOffers = demoOffers('appointment', 'http://127.0.0.1:3001');
    const readOffers = async (kind: 'appointment' | 'event' | 'journey') => {
      expect(kind).toBe('appointment');
      return sourceOffers;
    };

    const offers = await appointmentProvider.search({ readOffers }, 'routine checkup');
    expect(offers).toHaveLength(2);
    expect(offers[0].images).toEqual(sourceOffers[0].images);
    for (const original of sourceOffers[0].details) {
      expect(offers[0].details.some(detail => detail.title === original.title && detail.text === original.text)).toBe(true);
    }
    expect(offers.map(offer => offer.id)).toEqual(['appointment-morning', 'appointment-afternoon']);
  });

  it('keeps unverified appointment prices and fees unknown', () => {
    const offer = normalizeAppointmentOffer(baseOffer());
    expect(offer.price).toBeNull();
    expect(offer.unknownCosts.some(cost => /unknown|not confirmed/i.test(cost))).toBe(true);
    expect(offer.facts.find(fact => fact.label === 'Cost')?.value).toMatch(/unknown/i);
    expect(offer.facts.find(fact => fact.label === 'Cost')?.completeness).toBe('unknown');
    expect(offer.facts.find(fact => fact.label === 'Insurance')?.completeness).toBe('unknown');
    expect(offer.facts.find(fact => fact.label === 'Total cost')?.value).toMatch(/unknown/i);
  });

  it('does not turn a known price portion into a confirmed total', () => {
    const offer = normalizeAppointmentOffer({ ...baseOffer(), price: 35, priceLabel: '$35 visit fee', unknownCosts: ['Additional fees are unknown'] });
    expect(offer.price).toBe(35);
    expect(offer.unknownCosts).toContain('Additional fees are unknown');
    expect(offer.facts.find(fact => fact.label === 'Total cost')?.completeness).toBe('unknown');
  });

  it('adds explicit unknown costs when a price or fee is missing', () => {
    const offer = normalizeAppointmentOffer({ ...baseOffer(), unknownCosts: [] });
    expect(offer.price).toBeNull();
    expect(offer.unknownCosts.join(' ')).toMatch(/cost.*unknown/i);
    expect(offer.unknownCosts.join(' ')).toMatch(/fees.*unknown/i);
  });

  it('exposes every appointment condition for both offered slots', async () => {
    const offers = await appointmentProvider.search({ readOffers: async () => demoOffers('appointment', 'http://127.0.0.1:3001') }, 'appointment');
    for (const offer of offers) {
      const values = new Map(offer.facts.map(fact => [fact.label, fact.value]));
      for (const field of ['Practice', 'Practitioner', 'Specialty', 'Address', 'Visit type', 'Appointment', 'Duration', 'Access', 'Prerequisites', 'Cost', 'Insurance', 'Cancellation', 'Changes']) {
        expect(values.get(field), `${offer.id}: ${field}`).toBeTruthy();
      }
      expect(values.get('Cancellation')).toMatch(/24 hours/i);
      expect(values.get('Changes')).toMatch(/24 hours/i);
      expect(values.get('Appointment')).not.toMatch(/Unknown/);
      expect(values.get('Practitioner')).toMatch(/Unknown/);
      expect(values.get('Time zone')).toMatch(/Unknown/);
      expect(values.get('Date year')).toMatch(/Unknown/);
      expect(offer.facts.every(fact => fact.sourceUrl === offer.sourceUrl)).toBe(true);
    }
  });

  it('preserves original images, source links and partially extracted facts', () => {
    const input = baseOffer();
    input.images = [{ url: 'http://127.0.0.1:3001/fixture/images/practice.svg', alt: 'Fictional practice exterior', sourceUrl: input.sourceUrl }];
    input.facts.push({ label: 'Additional access information', value: 'Reception is on the ground floor', sourceUrl: `${input.sourceUrl}?section=access`, completeness: 'partial' });
    const offer = normalizeAppointmentOffer(input);
    expect(offer.images).toEqual(input.images);
    expect(offer.facts).toContainEqual(input.facts.at(-1));
    expect(input.facts).not.toHaveLength(offer.facts.length);
    expect(offer.completeness).toBe('partial');
  });

  it('makes unverified task constraints explicit for fixed demonstration slots', async () => {
    const offers = await appointmentProvider.search({ readOffers: async () => [baseOffer()] }, 'routine checkup');
    expect(offers[0].facts.find(fact => fact.label === 'Search limitations')?.value).toMatch(/requirements have not been verified as matched/i);
    expect(offers[0].facts.find(fact => fact.label === 'Search limitations')?.completeness).toBe('partial');
    expect(offers[0].details.find(detail => detail.title === 'Appointment matching limitations')?.text).toMatch(/fixed fictional demo slots/i);
    expect(offers[0].details.find(detail => detail.title === 'Appointment matching limitations')?.completeness).toBe('partial');
    expect(offers[0].facts.find(fact => fact.label === 'Specialty')?.value).toMatch(/general practitioner/i);
  });

  it.each([
    ['clinic', 'Book a checkup at Sunrise Clinic'],
    ['clinic without a preposition', 'Find Sunrise Clinic appointments'],
    ['lowercase clinic', 'sunrise clinic appointments'],
    ['date', 'Book a checkup on October 8'],
    ['specified year', 'Book a checkup on October 6, 2026'],
    ['ISO date', 'Book a checkup on 2026-10-06'],
    ['relative date', 'Book a checkup tomorrow'],
    ['location', 'Book a checkup in Berlin'],
    ['street address', 'Book a checkup at 25 Example Road'],
    ['specialty', 'Find a dentist appointment'],
    ['visit type', 'Find a video appointment'],
    ['practitioner', 'Book a checkup with Dr. Smith'],
    ['access', 'Find a wheelchair accessible appointment'],
    ['ambiguous time', 'Find an appointment at 10:30'],
    ['date comparison', 'Find an appointment after October 6'],
    ['unsupported time relation', 'Find an appointment after lunch'],
  ])('returns no verified match for an unsupported %s constraint', async (_kind, task) => {
    const offers = await appointmentProvider.search({ readOffers: async () => demoOffers('appointment', 'http://127.0.0.1:3001') }, task);
    expect(offers).toEqual([]);
  });

  it.each([
    ['Find a routine checkup at a local practice', ['appointment-morning', 'appointment-afternoon']],
    ['Find a GP appointment at Demo Health Practice', ['appointment-morning', 'appointment-afternoon']],
    ['Find a checkup at 18 Example Road', ['appointment-morning', 'appointment-afternoon']],
    ['Find a checkup on October 6', ['appointment-morning']],
    ['Find a checkup on Wednesday afternoon', ['appointment-afternoon']],
    ['Find an in-person checkup on October 6 at 10:30 AM', ['appointment-morning']],
    ['Find a checkup after 1 PM', ['appointment-afternoon']],
  ])('retains only verified fixed-slot conditions for %s', async (task, expected) => {
    const offers = await appointmentProvider.search({ readOffers: async () => demoOffers('appointment', 'http://127.0.0.1:3001') }, task);
    expect(offers.map(offer => offer.id)).toEqual(expected);
  });

  it('retains the shared test conditions when slot order changes', async () => {
    const input = demoOffers('appointment', 'http://127.0.0.1:3001').reverse();
    const offers = await appointmentProvider.search({ readOffers: async () => input }, 'appointment');
    expect(offers[0].id).toBe('appointment-afternoon');
    expect(offers[0].facts.find(fact => fact.label === 'Cancellation')?.value).toMatch(/24 hours/i);
    expect(offers[0].facts.find(fact => fact.label === 'Changes')?.value).toMatch(/24 hours/i);
  });

  it('rejects wrong kinds, real integration claims and mismatched source origins', async () => {
    expect(() => normalizeAppointmentOffer({ ...baseOffer(), kind: 'event' })).toThrow(/appointment/i);
    expect(() => normalizeAppointmentOffer({ ...baseOffer(), demo: false })).toThrow(/controlled/i);
    expect(() => normalizeAppointmentOffer({ ...baseOffer(), sourceUrl: 'https://practice.example/appointments' })).toThrow(/controlled/i);
    const input = baseOffer();
    input.images = [{ url: 'https://other.example/practice.jpg', alt: 'Practice image', sourceUrl: input.sourceUrl }];
    expect(() => normalizeAppointmentOffer(input)).toThrow(/different source origin/i);
    // Changing only the offer URL leaves field-level provenance pointing at the old origin.
    const inconsistentSource = { ...baseOffer(), sourceUrl: 'http://127.0.0.1:3002/fixture/appointment' };
    inconsistentSource.facts.push({ label: 'Original source', value: 'Fixture provenance', sourceUrl: baseOffer().sourceUrl, completeness: 'complete' });
    await expect(appointmentProvider.search({ readOffers: async () => [baseOffer(), inconsistentSource] }, 'appointment')).rejects.toThrow(/different source origin/i);

    // Independently verify that two internally consistent offers cannot use different origins.
    const alternateSource = baseOffer();
    const onAlternateOrigin = (value: string) => {
      const url = new URL(value);
      url.port = '3002';
      return url.href;
    };
    alternateSource.sourceUrl = onAlternateOrigin(alternateSource.sourceUrl);
    alternateSource.facts = alternateSource.facts.map(fact => ({ ...fact, sourceUrl: onAlternateOrigin(fact.sourceUrl ?? baseOffer().sourceUrl) }));
    alternateSource.details = alternateSource.details.map(detail => ({ ...detail, sourceUrl: onAlternateOrigin(detail.sourceUrl ?? baseOffer().sourceUrl) }));
    alternateSource.images = alternateSource.images.map(image => ({ ...image, url: onAlternateOrigin(image.url), sourceUrl: onAlternateOrigin(image.sourceUrl) }));
    const mixedSources = [baseOffer(), alternateSource];
    await expect(appointmentProvider.search({ readOffers: async () => mixedSources }, 'appointment')).rejects.toThrow(/different website origins/i);
  });

  it('does not infer or offer medical conclusions', () => {
    const offer = normalizeAppointmentOffer(baseOffer());
    const text = `${offer.title} ${offer.subtitle} ${offer.facts.map(fact => `${fact.label}: ${fact.value}`).join(' ')} ${offer.details.map(detail => detail.text).join(' ')}`;
    expect(text).toMatch(/appointment organization only/i);
    expect(text).toMatch(/does not provide diagnosis, treatment recommendations, or medical advice/i);
    expect(text).not.toMatch(/you (?:have|should take|need treatment)/i);
    expect(appointmentProvider).not.toHaveProperty('submit');
    expect(appointmentProvider).not.toHaveProperty('finalize');
  });

  it('does not derive a medical specialty from symptoms in the task', async () => {
    const offers = await appointmentProvider.search({ readOffers: async () => demoOffers('appointment', 'http://127.0.0.1:3001') }, 'Find a routine checkup; I have a rash and joint pain');
    expect(offers.map(offer => offer.id)).toEqual(['appointment-morning', 'appointment-afternoon']);
    expect(offers.every(offer => offer.facts.find(fact => fact.label === 'Specialty')?.value === 'General practitioner')).toBe(true);
    expect(offers.some(offer => JSON.stringify(offer).match(/dermatolog|rheumatolog|you should|you have/i))).toBe(false);
  });
});
