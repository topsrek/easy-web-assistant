import { offerSchema, type Offer, type TaskKind } from '../../shared/schema';

const fixtureSource = 'https://github.com/topsrek/easy-web-assistant/blob/main/src/pages-demo/fixtures.ts';
const observedAt = '2026-10-02T12:00:00.000Z';

const rawFixtures: unknown[] = [
  {
    id: 'pages-demo-event', kind: 'event', title: 'An evening of jazz',
    provider: 'Demo Arts Hall · Fictional', subtitle: 'A relaxed concert for two at a made-up venue.',
    price: 70, currency: 'USD', priceLabel: '$70 for two tickets; fees unknown',
    unknownCosts: ['Booking fees and taxes are unknown.'],
    facts: [
      { label: 'When', value: 'Saturday, November 14 · 7:30 PM' },
      { label: 'Where', value: 'Demo Arts Hall · Fictional Test District' },
      { label: 'Tickets', value: 'Two adults · Standard seating' },
      { label: 'Access', value: 'Step-free entrance; seat availability is not verified.' },
    ],
    details: [
      { title: 'About this fixture', text: 'A fictional acoustic quartet listing used to try the event card and approval flow.' },
      { title: 'Conditions', text: 'Refund, transfer, seat assignment, and booking-fee conditions are unknown.' },
    ],
    images: [{ url: new URL('./assets/event.svg', import.meta.url).href, alt: 'Fictional Demo Arts Hall jazz poster', sourceUrl: fixtureSource }],
    sourceUrl: fixtureSource, observedAt, demo: true, selectLabel: 'Review this test booking', completeness: 'complete',
  },
  {
    id: 'pages-demo-journey', kind: 'journey', title: 'A simple trip to the city',
    provider: 'Demo Rail · Fictional', subtitle: 'A direct return train in a made-up timetable.',
    price: 24, currency: 'USD', priceLabel: '$24 return for one adult; fictional fare',
    unknownCosts: ['Real fares and fees are not checked.'],
    facts: [
      { label: 'Route', value: 'Example Town → City Central' },
      { label: 'Outward', value: 'Saturday, November 7 · 9:15–10:02 AM' },
      { label: 'Return', value: 'Saturday, November 7 · 5:10–5:57 PM' },
      { label: 'Access', value: 'Step-free stations; assistance availability is not verified.' },
    ],
    details: [
      { title: 'Ticket conditions', text: 'Fictional off-peak return. Seat reservation and real service availability are not checked.' },
      { title: 'Changes and cancellation', text: 'No real operator policy is represented by this demo.' },
    ],
    images: [{ url: new URL('./assets/journey.svg', import.meta.url).href, alt: 'Illustration of a fictional Demo Rail journey', sourceUrl: fixtureSource }],
    sourceUrl: fixtureSource, observedAt, demo: true, selectLabel: 'Review this test journey', completeness: 'complete',
  },
  {
    id: 'pages-demo-appointment', kind: 'appointment', title: 'A routine checkup',
    provider: 'Demo Health Practice · Fictional', subtitle: 'A sample appointment at a made-up practice.',
    price: null, currency: 'USD', priceLabel: 'Visit cost and insurance coverage unknown',
    unknownCosts: ['No price, insurance coverage, or payment information is available.'],
    facts: [
      { label: 'When', value: 'Tuesday, November 10 · 10:30 AM' },
      { label: 'Care', value: 'General practitioner · In person · Fictional' },
      { label: 'Where', value: 'Demo Health Practice · Fictional Test District' },
      { label: 'Length', value: '20 minutes in this fixture' },
    ],
    details: [
      { title: 'Fixture limits', text: 'This is not medical advice and is not a real practice or appointment.' },
      { title: 'Preparation and changes', text: 'Real documents, eligibility, cancellation rules, and visit costs are unknown.' },
    ],
    images: [{ url: new URL('./assets/appointment.svg', import.meta.url).href, alt: 'Illustration of a fictional checkup appointment card', sourceUrl: fixtureSource }],
    sourceUrl: fixtureSource, observedAt, demo: true, selectLabel: 'Review this test appointment', completeness: 'complete',
  },
  {
    id: 'pages-demo-government', kind: 'government', title: 'Residence certificate appointment request',
    provider: 'Test Civic Office · Fictional', subtitle: 'A made-up civic office request for trying the review flow.',
    price: null, currency: 'USD', priceLabel: 'Government fees unknown',
    unknownCosts: ['Any administrative fee is unknown.'],
    facts: [
      { label: 'Authority & department', value: 'Test Civic Office · Resident Services · Fictional' },
      { label: 'Purpose', value: 'Request information about a residence certificate appointment' },
      { label: 'Location', value: '10 Example Square · Fictional Test District' },
      { label: 'Required documents', value: 'Unknown; no legal requirements are asserted.' },
      { label: 'Outcome', value: 'A simulated request receipt only; no application is filed.' },
    ],
    details: [
      { title: 'Office limits', text: 'This fictional office cannot issue certificates or provide legal advice.' },
      { title: 'What this action means', text: 'The browser demo records a simulated request receipt. It does not contact a government office or confirm an appointment.' },
    ],
    images: [{ url: new URL('./assets/government.svg', import.meta.url).href, alt: 'Illustration of a fictional civic office request', sourceUrl: fixtureSource }],
    sourceUrl: fixtureSource, observedAt, demo: true, selectLabel: 'Review this test request', completeness: 'complete',
  },
  {
    id: 'pages-demo-service', kind: 'service', title: 'Home repair assessment request',
    provider: 'Test Home Services · Fictional', subtitle: 'A sample request from a made-up home service provider.',
    price: null, currency: 'USD', priceLabel: 'Quote and total cost unknown',
    unknownCosts: ['Labour, call-out, travel, materials, and total costs are unknown.'],
    facts: [
      { label: 'Scope', value: 'Small household repair assessment' },
      { label: 'Provider', value: 'Test Home Services · Fictional' },
      { label: 'Service area', value: 'Fictional Test District; coverage is not verified.' },
      { label: 'Quote', value: 'No quote supplied; this is not a hire or booking.' },
      { label: 'Outcome', value: 'A simulated request receipt only.' },
    ],
    details: [
      { title: 'Request limits', text: 'Qualifications, availability, visit terms, cancellation policy, and materials are unknown.' },
      { title: 'Price limits', text: 'No estimate or total is implied.' },
    ],
    images: [{ url: new URL('./assets/service.svg', import.meta.url).href, alt: 'Illustration of a fictional home repair assessment', sourceUrl: fixtureSource }],
    sourceUrl: fixtureSource, observedAt, demo: true, selectLabel: 'Review this test request', completeness: 'complete',
  },
  {
    id: 'pages-demo-leisure', kind: 'leisure', title: 'Six-week pottery course',
    provider: 'Test Community Centre · Fictional', subtitle: 'A beginner course at a made-up community venue.',
    price: 54, currency: 'USD', priceLabel: '$54 course fee; materials unknown',
    unknownCosts: ['Clay, firing, and membership costs are unknown.'],
    facts: [
      { label: 'Category', value: 'Community learning · Pottery' },
      { label: 'Venue', value: '8 Example Lane · Fictional Test District' },
      { label: 'Schedule', value: 'Six Tuesdays from November 3 · 6:00–7:30 PM' },
      { label: 'Access', value: 'Step-free entrance stated in this fixture; room access is not verified.' },
      { label: 'Outcome', value: 'A simulated enrollment request receipt only.' },
    ],
    details: [
      { title: 'Materials and membership', text: 'The course fee is not a complete total. Materials and membership costs are unknown.' },
      { title: 'Availability', text: 'This fixed fictional listing does not represent live enrollment availability.' },
    ],
    images: [{ url: new URL('./assets/leisure.svg', import.meta.url).href, alt: 'Fictional community pottery course flyer', sourceUrl: fixtureSource }],
    sourceUrl: fixtureSource, observedAt, demo: true, selectLabel: 'Review this test enrollment request', completeness: 'complete',
  },
];

export const pagesDemoOffers = offerSchema.array().parse(rawFixtures);

export function inferPagesDemoKind(text: string): TaskKind | null {
  if (/government|civic|permit|license|licence|public office|municipal|passport|residence certificate|test civic/i.test(text)) return 'government';
  if (/repair|handyman|plumber|electrician|household help|contractor|home service|service request|maintenance/i.test(text)) return 'service';
  if (/course|class|workshop|exhibition|club|community centre|community center|leisure|pottery/i.test(text)) return 'leisure';
  if (/doctor|appointment|checkup|check-up|practice|clinic|dentist/i.test(text)) return 'appointment';
  if (/train|bus|coach|transport|journey|travel|rail|mobility|ride|transit/i.test(text)) return 'journey';
  if (/event|concert|jazz|music|show|theatre|theater|festival|ticket/i.test(text)) return 'event';
  return null;
}

export function pagesDemoOffersForText(text: string): Offer[] {
  const kind = inferPagesDemoKind(text);
  return kind ? pagesDemoOffers.filter((offer) => offer.kind === kind) : pagesDemoOffers;
}
