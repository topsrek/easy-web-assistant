import { kindSchema, offerSchema, type Offer, type Provider } from '../../shared/schema.js';

type GovernmentFact = Offer['facts'][number];
type GovernmentDetail = Offer['details'][number];

const UNKNOWN = 'Unknown — not stated in this fictional source.';

function isKnown(value: string | undefined): value is string {
  const trimmed = value?.trim();
  return Boolean(trimmed && !/^(?:unknown\b|not stated\b|not provided\b|no verified\b)/i.test(trimmed));
}

function factValue(offer: Offer, ...labels: string[]): string | undefined {
  const requested = new Set(labels.map(label => label.toLowerCase()));
  return offer.facts.find(fact => requested.has(fact.label.trim().toLowerCase())
    && fact.completeness === 'complete' && isKnown(fact.value))?.value;
}

function validateSource(offer: Offer): string {
  let source: URL;
  try {
    source = new URL(offer.sourceUrl);
  } catch {
    throw new Error('Government offer has an invalid test-source URL.');
  }
  if (!offer.demo || source.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(source.hostname)
    || source.pathname !== '/fixture/government' || source.username || source.password) {
    throw new Error('Government offer is outside the controlled civic-office test website.');
  }

  const relatedUrls = [
    ...offer.facts.flatMap(fact => fact.sourceUrl ? [fact.sourceUrl] : []),
    ...offer.details.flatMap(detail => detail.sourceUrl ? [detail.sourceUrl] : []),
    ...offer.images.flatMap(image => [image.url, image.sourceUrl]),
  ];
  if (relatedUrls.some(value => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return true;
    }
    return url.origin !== source.origin || Boolean(url.username || url.password);
  })) throw new Error('Government facts, details, or images have a different source origin.');
  return source.origin;
}

function fieldCompleteness(value: string): GovernmentFact['completeness'] {
  if (!isKnown(value)) return 'unknown';
  return /unknown|not confirmed|partial|needs checking|not verified/i.test(value) ? 'partial' : 'complete';
}

function addRequiredFact(facts: GovernmentFact[], offer: Offer, label: string, value: string | undefined) {
  const existing = facts.find(fact => fact.label.trim().toLowerCase() === label.toLowerCase());
  if (existing) {
    existing.sourceUrl ??= offer.sourceUrl;
    const detected = fieldCompleteness(existing.value);
    if (detected !== 'complete') existing.completeness = detected;
    return;
  }
  const normalized = value?.trim() || UNKNOWN;
  facts.push({ label, value: normalized, sourceUrl: offer.sourceUrl, completeness: fieldCompleteness(normalized) });
}

/** Normalize a fictional source offer while retaining the source's original information and provenance. */
export function normalizeGovernmentOffer(input: unknown): Offer {
  const offer = offerSchema.parse(input);
  if (String(offer.kind) !== 'government') throw new Error('Expected a government appointment offer.');
  validateSource(offer);

  const facts: GovernmentFact[] = offer.facts.map(fact => ({
    ...fact,
    sourceUrl: fact.sourceUrl ?? offer.sourceUrl,
    completeness: fieldCompleteness(fact.value) === 'complete' ? fact.completeness : fieldCompleteness(fact.value),
  }));
  const details: GovernmentDetail[] = offer.details.map(detail => ({
    ...detail,
    sourceUrl: detail.sourceUrl ?? offer.sourceUrl,
    completeness: fieldCompleteness(detail.text) === 'complete' ? detail.completeness : fieldCompleteness(detail.text),
  }));

  addRequiredFact(facts, offer, 'Authority', factValue(offer, 'Authority', 'Office') ?? (offer.provider.trim() || UNKNOWN));
  addRequiredFact(facts, offer, 'Department', factValue(offer, 'Department', 'Service area'));
  addRequiredFact(facts, offer, 'Purpose', factValue(offer, 'Purpose', 'Appointment purpose', 'Request type'));
  addRequiredFact(facts, offer, 'Place / address', factValue(offer, 'Place / address', 'Address', 'Location'));
  addRequiredFact(facts, offer, 'Appointment format', factValue(offer, 'Appointment format', 'Format', 'Visit type'));
  addRequiredFact(facts, offer, 'Date', factValue(offer, 'Date', 'Appointment date'));
  addRequiredFact(facts, offer, 'Year', factValue(offer, 'Year', 'Date year', 'Calendar year'));
  addRequiredFact(facts, offer, 'Time', factValue(offer, 'Time', 'Appointment time'));
  addRequiredFact(facts, offer, 'Time zone', factValue(offer, 'Time zone', 'Timezone'));
  addRequiredFact(facts, offer, 'Duration', factValue(offer, 'Duration', 'Appointment duration'));
  addRequiredFact(facts, offer, 'Access', factValue(offer, 'Access', 'Accessibility'));
  addRequiredFact(facts, offer, 'Required documents', factValue(offer, 'Required documents', 'Documents'));
  addRequiredFact(facts, offer, 'Prerequisites', factValue(offer, 'Prerequisites', 'Requirements'));
  addRequiredFact(facts, offer, 'Steps', factValue(offer, 'Steps', 'Process', 'What to do'));
  addRequiredFact(facts, offer, 'Fees', factValue(offer, 'Fees', 'Fee'));
  addRequiredFact(facts, offer, 'Total cost', factValue(offer, 'Total cost', 'Total fees'));
  addRequiredFact(facts, offer, 'Unknown charges', offer.unknownCosts.length ? offer.unknownCosts.join(' ') : UNKNOWN);
  addRequiredFact(facts, offer, 'Cancellation', factValue(offer, 'Cancellation', 'Cancellation rules'));
  addRequiredFact(facts, offer, 'Changes', factValue(offer, 'Changes', 'Change rules', 'Rescheduling'));
  addRequiredFact(facts, offer, 'Request and appointment status', factValue(offer, 'Request and appointment status', 'Application status', 'Appointment status'));
  addRequiredFact(facts, offer, 'Confirmation evidence', factValue(offer, 'Confirmation evidence', 'Confirmation'));
  addRequiredFact(facts, offer, 'Original images', offer.images.length ? `${offer.images.length} original image(s) supplied by the fictional test office.` : UNKNOWN);
  addRequiredFact(facts, offer, 'Search limitations', 'Fixed fictional test-office offers only. Requested location, date, format, and access needs have not been verified as matched.');
  addRequiredFact(facts, offer, 'Request outcome', 'Submitting this test request does not confirm an appointment. A request receipt is not evidence of a confirmed appointment.');

  const unknownCosts = [...offer.unknownCosts];
  if (!unknownCosts.some(item => /fee|charge|cost|total/i.test(item))) {
    unknownCosts.push('Any additional charges and the complete total cost are unknown unless explicitly stated by the fictional source.');
  }
  if (!details.some(detail => detail.title === 'Fixed demo matching limits')) {
    details.push({
      title: 'Fixed demo matching limits',
      text: 'These are fixed fictional test-office offers, not live government availability. The source does not establish a match for a requested location, date, appointment format, or access need unless that exact information is supplied. Requirements not stated in the source remain unknown.',
      sourceUrl: offer.sourceUrl,
      completeness: 'partial',
    });
  }
  if (!details.some(detail => detail.title === 'Test request outcome')) {
    details.push({
      title: 'Test request outcome',
      text: 'This fictional workflow submits a request only. It does not contact a real authority, file a real application, or confirm a real appointment. A receipt can confirm only that the test request was received.',
      sourceUrl: offer.sourceUrl,
      completeness: 'complete',
    });
  }
  if (!details.some(detail => detail.title === 'Fictional source scope')) {
    details.push({
      title: 'Fictional source scope',
      text: 'The office, documents, and requirements in this demo are invented for testing. They do not describe real administrative requirements and are not legal advice.',
      sourceUrl: offer.sourceUrl,
      completeness: 'complete',
    });
  }

  return offerSchema.parse({ ...offer, facts, details, unknownCosts, completeness: 'partial' });
}

export const governmentProvider: Provider = {
  get kind() { return kindSchema.parse('government'); },
  requiredFields: ['fullName', 'email'],
  actionLabel: 'Submit test appointment request',
  consequences: [
    'This submits a request to a fictional test civic office only.',
    'No real authority is contacted and no real application is filed.',
    'The fictional demo requirements are not real administrative guidance or legal advice.',
    'A submitted test request does not confirm a real appointment.',
    'Fees and total cost remain unknown unless the fictional source states them.',
  ],
  async search(browser, _text): Promise<Offer[]> {
    const offers = await browser.readOffers(kindSchema.parse('government'));
    const normalized = offers.map(normalizeGovernmentOffer);
    if (new Set(normalized.map(offer => new URL(offer.sourceUrl).origin)).size > 1) {
      throw new Error('Government offers came from different website origins.');
    }
    return normalized;
  },
};
