import { offerSchema, type Offer, type TaskKind } from '../shared/schema.js';

const observedAt = new Date().toISOString();
const common = { currency: 'USD' as const, observedAt, demo: true, images: [], unknownCosts: [], completeness: 'complete' as const };
export function demoOffers(kind: TaskKind, origin: string, session?: string): Offer[] {
  const sourceUrl = `${origin}/fixture/${kind}${session ? `?session=${encodeURIComponent(session)}` : ''}`;
  if (kind === 'event') return completeOffers([{ ...common, id: 'event-jazz', kind, provider: 'Demo Arts Hall', sourceUrl,
    title: 'An evening of jazz', subtitle: 'Live music, a comfortable seat, a lovely evening.', price: 70,
    priceLabel: '$70 for 2 tickets', selectLabel: 'Choose these tickets', unknownCosts: ['Booking fees are not confirmed'],
    facts: [{ label: 'When', value: 'Saturday, November 14 · 7:30 PM' }, { label: 'Where', value: 'Demo Arts Hall · 24 Example Street' }, { label: 'Tickets', value: '2 adults · Standard seating' }, { label: 'Access', value: 'Step-free entrance; accessible seat availability needs checking' }],
    details: [{ title: 'About the evening', text: 'An acoustic jazz quartet. This event is fictional and is used to try the booking interface.' }, { title: 'Ticket conditions', text: 'Allocated seating. Doors open at 7 PM. Refund and transfer conditions have not been provided.' }, { title: 'Price breakdown', text: '2 tickets × $35 = $70. Booking fees are unknown, so $70 is not a confirmed final total.' }],
    images: [{ url: `${origin}/fixture/images/jazz-poster.svg`, alt: 'Demo Arts Hall poster: An evening of jazz', sourceUrl }, { url: `${origin}/fixture/images/venue-plan.svg`, alt: 'Demo venue seating diagram with entrance and stage', sourceUrl }],
  }]);
  if (kind === 'journey') return completeOffers([{ ...common, id: 'journey-direct', kind, provider: 'Demo Rail', sourceUrl,
    title: 'A simple journey to the city', subtitle: 'A direct train, with no changes along the way.', price: 24,
    priceLabel: '$24 return · 1 adult', selectLabel: 'Choose this journey',
    facts: [{ label: 'Route', value: 'Example Town → City Central' }, { label: 'Outward', value: 'Saturday, October 10 · 9:15–10:02 AM' }, { label: 'Return', value: 'Saturday, October 10 · 5:10–5:57 PM' }, { label: 'Journey', value: '47 minutes each way · Direct' }, { label: 'Passenger', value: '1 adult · Standard class' }, { label: 'Access', value: 'Step-free stations; boarding assistance must be requested separately' }],
    details: [{ title: 'Validity & changes', text: 'Demo off-peak return, valid only on October 10. No specific train restriction in this fixture. Seat reservation is not included.' }, { title: 'Cancellation', text: 'Refundable before the first departure in this test scenario. No fee. These are fictional conditions, not a real operator policy.' }, { title: 'Price breakdown', text: '1 adult return ticket: $24. No extra fees in this test fixture.' }],
  }, { ...common, id: 'journey-bus', kind, provider: 'Demo Coach', sourceUrl,
    title: 'A lower-cost coach journey', subtitle: 'A little longer, with a lower fare.', price: 16, priceLabel: '$16 return · 1 adult', selectLabel: 'Choose this journey',
    facts: [{ label: 'Route', value: 'Example Town → City Coach Station' }, { label: 'Outward', value: 'Saturday, October 10 · 9:00–10:20 AM' }, { label: 'Return', value: 'Saturday, October 10 · 5:30–6:50 PM' }, { label: 'Journey', value: '1 hour 20 minutes · Direct' }, { label: 'Access', value: 'Accessible vehicle availability is not confirmed' }],
    details: [{ title: 'Ticket conditions', text: 'Valid only on the selected services. Non-refundable. Seat included. These are fictional demo conditions.' }, { title: 'Price breakdown', text: '1 adult return ticket: $16. No extra fees in this test fixture.' }],
  }]);
  if (kind === 'appointment') return completeOffers([{ ...common, id: 'appointment-morning', kind, provider: 'Demo Health Practice', sourceUrl,
    title: 'Your routine checkup', subtitle: 'A morning appointment at a local practice.', price: null,
    priceLabel: 'Visit cost not confirmed', selectLabel: 'Choose this time', unknownCosts: ['Insurance coverage and visit cost are not confirmed'],
    facts: [{ label: 'When', value: 'Tuesday, October 6 · 10:30 AM' }, { label: 'Care', value: 'General practitioner · In person' }, { label: 'Where', value: 'Demo Health Practice · 18 Example Road' }, { label: 'Length', value: '20 minutes' }, { label: 'Access', value: 'Ground-floor reception; further access needs can be requested' }],
    details: [{ title: 'Before your visit', text: 'Bring your identification and any insurance information requested by the practice. This is a fictional appointment, not medical advice.' }, { title: 'Changing the appointment', text: 'Cancel or reschedule at least 24 hours beforehand in this test scenario. Real practice conditions need to be checked.' }, { title: 'Cost & coverage', text: 'No verified price or coverage information. No payment is taken by this app.' }],
  }, { ...common, id: 'appointment-afternoon', kind, provider: 'Demo Health Practice', sourceUrl,
    title: 'An afternoon alternative', subtitle: 'The same practice, a different time.', price: null, priceLabel: 'Visit cost not confirmed', selectLabel: 'Choose this time', unknownCosts: ['Insurance coverage and visit cost are not confirmed'],
    facts: [{ label: 'When', value: 'Wednesday, October 7 · 2:00 PM' }, { label: 'Care', value: 'General practitioner · In person' }, { label: 'Where', value: 'Demo Health Practice · 18 Example Road' }, { label: 'Length', value: '20 minutes' }],
    details: [{ title: 'Appointment conditions', text: 'The same fictional practice conditions apply. This appointment is for testing only.' }],
  }]);
  if (kind === 'government') return completeOffers([{
    ...common, id: 'government-civic-appointment', kind, provider: 'Test Civic Office · Fictional', sourceUrl,
    title: 'Residence certificate appointment request', subtitle: 'A sample appointment request at a fictional local civic office.',
    price: null, priceLabel: 'Government fees are not confirmed', selectLabel: 'Review this appointment request',
    unknownCosts: ['Any administrative fee is unknown'],
    facts: [
      { label: 'Authority & department', value: 'Test Civic Office · Resident Services' },
      { label: 'Purpose', value: 'Request an appointment about a residence certificate' },
      { label: 'Location', value: '10 Example Square · Fictional Test District' },
      { label: 'Format', value: 'In person · Appointment year and time zone are not verified' },
      { label: 'Date & time', value: 'Wednesday, October 14 · 11:00 AM · Year and time zone unknown' },
      { label: 'Duration', value: 'Unknown' }, { label: 'Access information', value: 'Unknown' },
      { label: 'Required documents', value: 'Unknown; no legal requirements are asserted' },
      { label: 'Prerequisites & steps', value: 'Unknown' },
      { label: 'Availability', value: 'A fixed fictional test slot; not a real government appointment' },
      { label: 'Application state', value: 'Appointment request only; no application is filed' },
      { label: 'Confirmation evidence', value: 'A test request receipt only' },
    ],
    details: [
      { title: 'Test office limits', text: 'This fictional office cannot issue certificates or provide legal advice. Document requirements, eligibility, administrative steps and fees have not been verified.' },
      { title: 'Cancellation and changes', text: 'No verified cancellation or change policy is supplied.' },
      { title: 'What a request means', text: 'Submitting this demo action records a test request only. It does not contact an authority or confirm a real appointment.' },
    ],
  }]);
  if (kind === 'service') return completeOffers([{
    ...common, id: 'service-home-repair', kind, provider: 'Test Home Services · Fictional', sourceUrl,
    title: 'Home repair assessment request', subtitle: 'A fictional local provider for trying a service request.',
    price: null, priceLabel: 'Quote and total cost are unknown', selectLabel: 'Review this service request',
    unknownCosts: ['Labour, call-out, travel, materials and total are unknown'],
    facts: [
      { label: 'Service scope', value: 'Small household repair assessment' },
      { label: 'Provider', value: 'Test Home Services · Fictional test provider' },
      { label: 'Service area', value: 'Fictional Test District; exact coverage needs confirmation' },
      { label: 'Visit & location', value: 'Home visit requested; address collection is not part of this fixture' },
      { label: 'Time window', value: 'Friday, October 16 · 1:00–4:00 PM · Year and time zone unknown' },
      { label: 'Availability & qualifications', value: 'Unknown; no real provider availability or qualification is claimed' },
      { label: 'Quote basis', value: 'Assessment request only; no quote supplied' },
      { label: 'Labour / call-out / travel / materials', value: 'Unknown' },
      { label: 'Confirmed total', value: 'Unknown; no total can be calculated' },
      { label: 'Cancellation conditions', value: 'Unknown' },
      { label: 'Request state', value: 'Unbinding test request; no contractor is engaged' },
      { label: 'Confirmation evidence', value: 'A test request receipt only' },
    ],
    details: [
      { title: 'Request conditions', text: 'The fictional provider has not supplied qualification, availability, visit, cancellation or materials terms. A request does not accept a quote or hire a contractor.' },
      { title: 'Price limits', text: 'Labour, call-out, travel, materials and total costs are unknown. No estimate is implied.' },
    ],
  }]);
  return completeOffers([{
    ...common, id: 'leisure-pottery-course', kind: 'leisure', provider: 'Test Community Centre · Fictional', sourceUrl,
    title: 'Six-week pottery course', subtitle: 'A recurring beginner course at a fictional community centre.',
    price: 54, priceLabel: '$54 course fee · materials not included or priced', selectLabel: 'Review this enrollment request',
    unknownCosts: ['Clay and materials fees are unknown'],
    facts: [
      { label: 'Category', value: 'Community learning · Pottery' },
      { label: 'Organizer', value: 'Test Community Centre · Fictional' },
      { label: 'Venue & address', value: '8 Example Lane · Fictional Test District' },
      { label: 'Schedule', value: 'Six Tuesdays starting October 13 · 6:00–7:30 PM · Year and time zone unknown' },
      { label: 'Participation requirements', value: 'Beginner friendly; any other prerequisites are unknown' },
      { label: 'Capacity & availability', value: 'Unknown; this is not a live seat count' },
      { label: 'Course fee', value: '$54 for the six sessions' },
      { label: 'Materials & membership', value: 'Materials fees and membership requirements are unknown' },
      { label: 'Access information', value: 'Step-free entrance stated; room and equipment access need checking' },
      { label: 'Cancellation & transfer', value: 'Unknown' },
      { label: 'Enrollment state', value: 'Test enrollment request only; participation is not confirmed' },
      { label: 'Confirmation evidence', value: 'A test request receipt only' },
    ],
    details: [
      { title: 'Materials and membership', text: 'The source fixture gives no clay, firing or membership price. The $54 course fee is not a complete total.' },
      { title: 'Cancellation and transfer', text: 'No cancellation, transfer or missed-session policy has been verified.' },
      { title: 'Fixed demo limits', text: 'This fictional listing is fixed and does not establish real enrollment availability or eligibility.' },
    ],
    images: [{ url: `${origin}/fixture/images/pottery-course.svg`, alt: 'Fictional Test Community Centre pottery course flyer', sourceUrl }],
  }]);
}
function completeOffers(values: unknown[]): Offer[] {
  const parsed = offerSchema.array().parse(values);
  return parsed.map((offer) => ({
    ...offer,
    facts: offer.facts.map((fact) => ({ ...fact, sourceUrl: fact.sourceUrl ?? offer.sourceUrl })),
    details: offer.details.map((detail) => ({ ...detail, sourceUrl: detail.sourceUrl ?? offer.sourceUrl })),
    images: offer.images.map((image) => ({ ...image, sourceUrl: offer.sourceUrl })),
  }));
}
export function inferKind(text: string): TaskKind | null {
  if (/government|civic|permit|licen[cs]e|public office|municipal|passport|residence certificate|test civic/i.test(text)) return 'government';
  if (/repair|handyman|plumber|electrician|household help|contractor|home service|service request|maintenance/i.test(text)) return 'service';
  if (/course|class|workshop|exhibition|club|community centre|community center|leisure|pottery/i.test(text)) return 'leisure';
  if (/doctor|appointment|checkup|check.up|practice|clinic|dentist/i.test(text)) return 'appointment';
  if (/train|bus|coach|transport|journey|travel|rail|mobility|ride|transit/i.test(text)) return 'journey';
  if (/event|concert|jazz|music|show|theatre|theater|festival|ticket/i.test(text)) return 'event';
  return null;
}
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function fixtureHtml(kind: TaskKind, origin: string, session: string, suppliedOffers?: Offer[]) {
  const offers = suppliedOffers ?? demoOffers(kind, origin);
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>${escapeHtml(offers[0].provider)} — Test website</title><style>body{font:20px/1.5 system-ui;background:#f7f8f3;color:#263e38;max-width:960px;margin:40px auto;padding:20px}article{background:white;border:1px solid #d9e2db;border-radius:20px;margin:20px 0;padding:28px}img{max-width:300px;max-height:230px;object-fit:contain}button{font:inherit;border:0;border-radius:12px;padding:15px 25px}button:disabled{background:#dfe5e0;color:#46564d}dt{font-weight:600}dd{margin:0 0 14px}small{color:#58655f}section{margin-top:22px}</style><body data-session="${escapeHtml(session)}"><small>CONTROLLED TEST WEBSITE · Fictional test information only</small><h1>${escapeHtml(offers[0].provider)}</h1>${offers.map(renderFixtureOffer).join('')}<script type="application/json" id="offers">${JSON.stringify(offers).replace(/</g,'\\u003c')}</script></body></html>`;
}

function renderFixtureOffer(offer: Offer) {
  const details = offer.details.map((detail) => `<article><h4>${escapeHtml(detail.title)}</h4><p>${escapeHtml(detail.text)}</p></article>`).join('');
  const unknownCosts = offer.unknownCosts.length
    ? `<section aria-label="Unknown costs"><h3>Unknown costs</h3><ul>${offer.unknownCosts.map((cost) => `<li>${escapeHtml(cost)}</li>`).join('')}</ul></section>`
    : '';
  return `<article><h2>${escapeHtml(offer.title)}</h2><p>${escapeHtml(offer.subtitle)}</p>${offer.images.map((image) => `<img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt)}">`).join('')}<p><strong>${escapeHtml(offer.priceLabel)}</strong></p><dl>${offer.facts.map((fact) => `<dt>${escapeHtml(fact.label)}</dt><dd>${escapeHtml(fact.value)}</dd>`).join('')}</dl><section aria-label="Source details"><h3>Source details</h3>${details}</section>${unknownCosts}<p>Listed control: ${escapeHtml(offer.selectLabel)}</p><p>The test action is disabled on this source page. Review and confirm any action in the assistant.</p><button type="button" disabled aria-disabled="true">Test action unavailable here</button></article>`;
}
