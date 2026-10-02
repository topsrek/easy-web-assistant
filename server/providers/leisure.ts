import { offerSchema, type Offer, type Profile, type Provider, type TaskKind } from '../../shared/schema.js';

type LeisureFact = Offer['facts'][number];
type LeisureDetail = Offer['details'][number];
type LeisureBrowser = { readOffers(kind: TaskKind): Promise<Offer[]> };

const UNKNOWN = 'Unknown — not provided by this fictional test website.';

const known = (value: string) => Boolean(value.trim()) && !/^(?:unknown\b|not provided\b|not stated\b)/i.test(value.trim());

function completeness(value: string): LeisureFact['completeness'] {
  if (!known(value)) return 'unknown';
  return /unknown|not confirmed|not stated|needs checking|ask the centre|subject to confirmation/i.test(value)
    ? 'partial'
    : 'complete';
}

function validateSource(offer: Offer): string {
  let source: URL;
  try {
    source = new URL(offer.sourceUrl);
  } catch {
    throw new Error('Leisure offer has an invalid source URL.');
  }
  if (!offer.demo || source.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(source.hostname)
    || source.pathname !== '/fixture/leisure' || source.username || source.password) {
    throw new Error('Leisure offer is outside the controlled fictional test website.');
  }
  const relatedUrls = [
    ...offer.facts.flatMap(fact => fact.sourceUrl ? [fact.sourceUrl] : []),
    ...offer.details.flatMap(detail => detail.sourceUrl ? [detail.sourceUrl] : []),
    ...offer.images.flatMap(image => [image.url, image.sourceUrl]),
  ];
  if (relatedUrls.some(value => {
    try {
      const url = new URL(value);
      return url.origin !== source.origin || Boolean(url.username || url.password);
    } catch {
      return true;
    }
  })) throw new Error('Leisure facts, details, or images have a different source origin.');
  return source.origin;
}

function factValue(offer: Offer, ...labels: string[]): string | undefined {
  const wanted = new Set(labels.map(label => label.toLowerCase()));
  return offer.facts.find(fact => wanted.has(fact.label.trim().toLowerCase()) && known(fact.value))?.value;
}

function statedFactValue(offer: Offer, ...labels: string[]): string | undefined {
  const wanted = new Set(labels.map(label => label.toLowerCase()));
  const value = offer.facts.find(fact => wanted.has(fact.label.trim().toLowerCase()))?.value.trim();
  return value || undefined;
}

function detailText(offer: Offer, ...terms: string[]): string | undefined {
  const found = offer.details
    .filter(detail => terms.some(term => `${detail.title} ${detail.text}`.toLowerCase().includes(term)))
    .map(detail => detail.text.trim())
    .filter(Boolean);
  return found.length ? found.join(' ') : undefined;
}

function upsertFact(facts: LeisureFact[], offer: Offer, label: string, value: string) {
  const existing = facts.find(fact => fact.label.trim().toLowerCase() === label.toLowerCase());
  if (existing) {
    existing.sourceUrl ??= offer.sourceUrl;
    if (!existing.value.trim()) {
      existing.value = UNKNOWN;
      existing.completeness = 'unknown';
    }
    const detected = completeness(existing.value);
    if (detected !== 'complete') existing.completeness = detected;
    return;
  }
  facts.push({ label, value: value.trim() || UNKNOWN, sourceUrl: offer.sourceUrl, completeness: completeness(value) });
}

/** Preserve the fictional centre's offer and make leisure-specific decision fields explicit. */
export function normalizeLeisureOffer(input: unknown): Offer {
  const offer = offerSchema.parse(input);
  if (offer.kind !== 'leisure') throw new Error('Leisure provider received an offer of another type.');
  validateSource(offer);

  const facts: LeisureFact[] = offer.facts.map(fact => ({
    ...fact,
    sourceUrl: fact.sourceUrl ?? offer.sourceUrl,
    completeness: completeness(fact.value) === 'complete' ? fact.completeness : completeness(fact.value),
  }));
  const details: LeisureDetail[] = offer.details.map(detail => ({
    ...detail,
    sourceUrl: detail.sourceUrl ?? offer.sourceUrl,
    completeness: completeness(detail.text) === 'complete' ? detail.completeness : completeness(detail.text),
  }));

  const category = factValue(offer, 'Category', 'Activity type', 'Offer type') ?? UNKNOWN;
  const organizer = offer.provider.trim() || UNKNOWN;
  const venue = factValue(offer, 'Venue', 'Location') ?? UNKNOWN;
  const address = factValue(offer, 'Address', 'Venue address', 'Venue & address') ?? UNKNOWN;
  const schedule = factValue(offer, 'Schedule', 'Dates and times', 'When') ?? UNKNOWN;
  const frequency = factValue(offer, 'Schedule type', 'Occurrence', 'Frequency')
    ?? (known(schedule) && /\b(?:weekly|every|recurring|sessions?\s*\d|(?:two|three|four|five|six|[2-9])\s+(?:sessions?|weeks?|mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?))\b/i.test(schedule)
      ? 'Multiple or recurring sessions (see full schedule).'
      : UNKNOWN);
  const prerequisites = factValue(offer, 'Prerequisites', 'Participation requirements')
    ?? detailText(offer, 'prerequisite', 'requirement', 'eligib', 'bring', 'participat') ?? UNKNOWN;
  const availability = statedFactValue(offer, 'Availability', 'Capacity', 'Places', 'Capacity & availability') ?? UNKNOWN;
  const membership = detailText(offer, 'membership', 'member')
    ?? factValue(offer, 'Membership', 'Materials & membership') ?? UNKNOWN;
  const access = factValue(offer, 'Access', 'Accessibility', 'Access information')
    ?? detailText(offer, 'access', 'accessible', 'step-free') ?? UNKNOWN;
  const cancellation = detailText(offer, 'cancel', 'cancellation') ?? UNKNOWN;
  const transfer = detailText(offer, 'transfer', 'substitut', 'change attendee') ?? UNKNOWN;
  const materials = factValue(offer, 'Materials', 'Equipment', 'What to bring')
    ?? detailText(offer, 'material', 'equipment', 'bring') ?? UNKNOWN;
  const cost = offer.price === null
    ? UNKNOWN
    : `${offer.priceLabel} (listed amount ${offer.currency} ${offer.price.toFixed(2)}; the source does not establish that this is the complete cost)`;
  const fees = factValue(offer, 'Fees', 'Additional fees', 'Total cost') ?? UNKNOWN;

  const required: Array<[string, string]> = [
    ['Category', category], ['Organizer', organizer], ['Venue', venue], ['Address', address],
    ['Occurrence pattern', frequency], ['Full schedule', schedule],
    ['Time zone', factValue(offer, 'Time zone', 'Timezone') ?? UNKNOWN],
    ['Participation prerequisites', prerequisites], ['Availability', availability],
    ['Listed cost', cost], ['Additional fees and total cost', fees], ['Materials and equipment', materials],
    ['Membership conditions', membership], ['Access information', access],
    ['Cancellation', cancellation], ['Transfer or attendee changes', transfer],
    ['Enrollment outcome', 'A submitted test enrollment request is not confirmation of participation.'],
    ['Original images', offer.images.length ? `${offer.images.length} original fictional test-provider image(s); image URLs and alt text are preserved.` : UNKNOWN],
    ['Search limitations', 'Fixed fictional demo offers only. The requested activity, location, dates, schedule, access needs and availability have not been verified as a match.'],
  ];
  for (const [label, value] of required) upsertFact(facts, offer, label, value);

  const unknownCosts = [...offer.unknownCosts];
  if (!unknownCosts.some(item => /cost|price|fee|material|membership/i.test(item))) {
    unknownCosts.push('Complete enrollment cost, fees, materials and membership charges are not verified by this source.');
  }
  return {
    ...offer,
    facts,
    details: [
      ...details,
      {
        title: 'Leisure request and source limitations',
        text: `This is a fictional fixed test offer from ${offer.sourceUrl}. Selecting it or submitting the test enrollment request does not book a real activity or confirm participation. Schedule and all unknown or partial conditions above remain as stated by the source.`,
        sourceUrl: offer.sourceUrl,
        completeness: 'partial',
      },
    ],
    unknownCosts,
    completeness: offer.completeness === 'complete' ? 'partial' : offer.completeness,
  };
}

const consequences = [
  'Fictional enrollment inquiry only; no real activity is booked and no payment is made.',
  'Submitting this request does not confirm enrollment or participation.',
];

export const leisureProvider: Provider = {
  kind: 'leisure',
  requiredFields: ['fullName', 'email'] satisfies Array<keyof Profile>,
  actionLabel: 'Submit test enrollment request',
  consequences,
  async search(browser: LeisureBrowser, _text: string): Promise<Offer[]> {
    const offers = await browser.readOffers('leisure');
    return offers.map(normalizeLeisureOffer);
  },
};
