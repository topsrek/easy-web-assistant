import { offerSchema, type Offer, type Profile, type Provider, type TaskKind } from '../../shared/schema.js';

type JourneyBrowser = { readOffers(kind: TaskKind): Promise<Offer[]> };

const UNKNOWN = 'Unknown — not stated by the fixed test website.';

const REQUIRED_FACTS = [
  'Operator', 'Starting point', 'Destination', 'Intermediate stops',
  'Outward departure', 'Outward arrival', 'Return departure', 'Return arrival',
  'Journey duration', 'Transfers and transfer times', 'Class', 'Passengers',
  'Seat reservation', 'Baggage', 'Accessibility', 'Fare validity',
  'Train restrictions', 'Discounts', 'Ticket price', 'Fees and total price',
  'Cancellation', 'Changes',
] as const;

function fact(offer: Offer, ...labels: string[]) {
  return offer.facts.find(item => labels.some(label => item.label.toLowerCase() === label.toLowerCase()))?.value;
}

function detail(offer: Offer, ...terms: string[]) {
  return offer.details.find(item => terms.some(term => item.title.toLowerCase().includes(term)))?.text ?? '';
}

function routeParts(offer: Offer) {
  const route = fact(offer, 'Route');
  if (!route) return { start: UNKNOWN, destination: UNKNOWN };
  const parts = route.split(/\s*(?:→|->|\bto\b)\s*/i);
  return parts.length === 2
    ? { start: parts[0].trim(), destination: parts[1].trim() }
    : { start: UNKNOWN, destination: UNKNOWN };
}

function schedule(value: string | undefined) {
  if (!value) return { date: UNKNOWN, departure: UNKNOWN, arrival: UNKNOWN };
  const date = value.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+[A-Z][a-z]+\s+\d{1,2}/)?.[0] ?? UNKNOWN;
  const times = value.match(/\b\d{1,2}:\d{2}\s*(?:–|-|to)\s*\d{1,2}:\d{2}\s*(?:AM|PM)\b/i);
  if (!times) return { date, departure: UNKNOWN, arrival: UNKNOWN };
  const [departureRaw, arrivalRaw] = times[0].split(/\s*(?:–|-|to)\s*/i);
  const suffix = arrivalRaw.match(/AM|PM/i)?.[0] ?? '';
  const departure = /AM|PM/i.test(departureRaw) ? departureRaw : `${departureRaw} ${suffix}`;
  return { date, departure, arrival: arrivalRaw };
}

function sourceOrigin(offer: Offer) {
  const source = new URL(offer.sourceUrl);
  if (!offer.demo || source.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(source.hostname)
    || source.pathname !== '/fixture/journey' || source.username || source.password) {
    throw new Error('Journey offer is outside the controlled journey test website.');
  }
  const relatedUrls = [
    ...offer.facts.flatMap(item => item.sourceUrl ? [item.sourceUrl] : []),
    ...offer.details.flatMap(item => item.sourceUrl ? [item.sourceUrl] : []),
    ...offer.images.flatMap(image => [image.url, image.sourceUrl]),
  ];
  if (relatedUrls.some(value => {
    const url = new URL(value);
    return url.origin !== source.origin || Boolean(url.username || url.password);
  })) throw new Error('Journey facts, details, or images have a different source origin.');
  return source.origin;
}

function completeness(value: string) {
  if (value.startsWith('Unknown')) return 'unknown' as const;
  if (/not confirmed|unknown|must be requested|needs checking|not stated/i.test(value)) return 'partial' as const;
  return 'complete' as const;
}

/** Adds an explicit, source-grounded account of every required journey condition. */
export function normalizeJourneyOffer(input: Offer): Offer {
  const offer = offerSchema.parse(input);
  if (offer.kind !== 'journey') throw new Error('Journey provider received a non-journey offer.');
  sourceOrigin(offer);

  const route = routeParts(offer);
  const outward = schedule(fact(offer, 'Outward'));
  const returning = schedule(fact(offer, 'Return'));
  const journey = fact(offer, 'Journey');
  const passengerFact = fact(offer, 'Passenger', 'Passengers');
  const access = fact(offer, 'Access');
  const validity = detail(offer, 'validity');
  const conditions = offer.details.map(item => item.text).join(' ');
  const reservation = conditions.match(/(?:Seat reservation is not included|seat included|reservation included|reservation is included)/i)?.[0];
  const fees = conditions.match(/(?:No extra fees in this test fixture|No extra fees|fees? (?:are|is) unknown|booking fees? (?:are|is) unknown)/i)?.[0];
  const trainRestriction = conditions.match(/No specific train restriction[^.]*/i)?.[0]
    ?? conditions.match(/Valid only on the selected services|valid only on the selected services/i)?.[0];
  const cancellation = conditions.match(/(?:Non-refundable[^.]*|Refundable[^.]*|Cancellation[^.]*|cancel[^.]*24 hours[^.]*)/i)?.[0];
  const changes = conditions.match(/(?:reschedule[^.]*|change[^.]*|No change[^.]*)/i)?.[0];
  const direct = Boolean(journey?.match(/Direct/i));
  const transfers = direct ? '0; direct service; no transfer times apply.' : UNKNOWN;
  const stops = fact(offer, 'Intermediate stops', 'Stops', 'Calling points') ?? UNKNOWN;
  const duration = journey?.match(/\d+\s*(?:hour|minute)[^·,]*/i)?.[0]?.trim() ?? UNKNOWN;
  const classValue = passengerFact?.match(/\b(Standard|First) class\b/i)?.[0] ?? UNKNOWN;
  const passengerValue = passengerFact?.split(/[·,]/)[0]?.trim()
    ?? offer.priceLabel.match(/\b\d+\s+(?:adult|adults|passenger|passengers)\b/i)?.[0]
    ?? UNKNOWN;
  const feeValue = fees
    ? `${fees}. ${offer.priceLabel}${/unknown/i.test(fees) ? '; final total is unknown.' : ''}`
    : UNKNOWN;

  const values: Record<(typeof REQUIRED_FACTS)[number], string> = {
    'Operator': offer.provider,
    'Starting point': route.start,
    'Destination': route.destination,
    'Intermediate stops': stops,
    'Outward departure': outward.departure === UNKNOWN ? UNKNOWN : `${outward.date} · ${outward.departure}`,
    'Outward arrival': outward.arrival === UNKNOWN ? UNKNOWN : `${outward.date} · ${outward.arrival}`,
    'Return departure': returning.departure === UNKNOWN ? UNKNOWN : `${returning.date} · ${returning.departure}`,
    'Return arrival': returning.arrival === UNKNOWN ? UNKNOWN : `${returning.date} · ${returning.arrival}`,
    'Journey duration': duration,
    'Transfers and transfer times': transfers,
    'Class': classValue,
    'Passengers': passengerValue,
    'Seat reservation': reservation ?? UNKNOWN,
    'Baggage': UNKNOWN,
    'Accessibility': access ?? UNKNOWN,
    'Fare validity': validity.match(/[^.]+/i)?.[0] ?? UNKNOWN,
    'Train restrictions': trainRestriction ?? UNKNOWN,
    'Discounts': UNKNOWN,
    'Ticket price': offer.price === null ? `${offer.priceLabel}; numeric fare unknown.` : `${offer.priceLabel} (listed amount ${offer.currency} ${offer.price.toFixed(2)}).`,
    'Fees and total price': feeValue,
    'Cancellation': cancellation ?? UNKNOWN,
    'Changes': changes ?? UNKNOWN,
  };

  const existing = new Set(offer.facts.map(item => item.label.toLowerCase()));
  const sourcedFacts = offer.facts.map(item => {
    const detected = completeness(item.value);
    return {
      ...item,
      sourceUrl: item.sourceUrl ?? offer.sourceUrl,
      completeness: detected === 'complete' ? item.completeness : detected,
    };
  });
  const normalizedFacts = REQUIRED_FACTS
    .filter(label => !existing.has(label.toLowerCase()))
    .map(label => ({ label, value: values[label], sourceUrl: offer.sourceUrl, completeness: values[label] === UNKNOWN ? 'unknown' as const : 'complete' as const }));
  return {
    ...offer,
    facts: [...sourcedFacts, ...normalizedFacts],
    details: [
      ...offer.details.map(item => {
        const detected = completeness(item.text);
        return {
          ...item,
          sourceUrl: item.sourceUrl ?? offer.sourceUrl,
          completeness: detected === 'complete' ? item.completeness : detected,
        };
      }),
      { title: 'Journey information and source', text: `All journey facts above were read from this fixed fictional test provider. Source: ${offer.sourceUrl}. Fields marked Unknown were not provided by the website.`, sourceUrl: offer.sourceUrl, completeness: 'complete' as const },
    ],
  };
}

function matchesRequest(offer: Offer, text: string) {
  const lower = text.toLowerCase();
  const allText = [offer.title, offer.subtitle, ...offer.facts.map(item => item.value), ...offer.details.map(item => item.text)].join(' ').toLowerCase();

  // A requested mode is a hard requirement; price never relaxes it.
  if (/\btrain\b|\brail\b/.test(lower) && /coach|bus/i.test(offer.provider + ' ' + offer.title)) return false;
  if (/\b(?:bus|coach)\b/.test(lower) && /\b(?:rail|train)\b/i.test(offer.provider + ' ' + offer.title)) return false;

  const normalizedFacts = new Map(offer.facts.map(item => [item.label.toLowerCase(), item.value]));
  const stops = normalizedFacts.get('intermediate stops') ?? UNKNOWN;
  if (/\bno stops?\b|\bwithout stops?\b/i.test(text) && (stops.startsWith('Unknown') || !/^(?:none|no intermediate stops)\b/i.test(stops))) return false;

  const requestedClass = lower.match(/\b(first|standard|second)\s+class\b/)?.[0];
  if (requestedClass) {
    const actualClass = normalizedFacts.get('class') ?? UNKNOWN;
    if (actualClass.startsWith('Unknown') || actualClass.toLowerCase() !== requestedClass) return false;
  }

  const passengerWords: Record<string, number> = { one: 1, two: 2, three: 3, four: 4 };
  const requestedPassenger = lower.match(/\b(\d+|one|two|three|four)\s+(?:adult|adults|passenger|passengers|people|traveller|travellers|traveler|travelers)\b/);
  if (requestedPassenger) {
    const count = Number(requestedPassenger[1]) || passengerWords[requestedPassenger[1]];
    const actual = normalizedFacts.get('passengers') ?? UNKNOWN;
    const actualCount = actual.match(/\b\d+\b/)?.[0];
    if (actual.startsWith('Unknown') || !actualCount || Number(actualCount) !== count) return false;
  }

  if (/\bone[- ]way\b|\bsingle\s+ticket\b/i.test(text) && normalizedFacts.get('return arrival') !== UNKNOWN) return false;
  if (/\breturn(?:\s+ticket)?\b|\bround[- ]trip\b/i.test(text) && normalizedFacts.get('return arrival') === UNKNOWN) return false;

  const requestedCancellation = /\bnon[- ]refundable\b/i.test(text) ? 'non-refundable'
    : /\brefundable\b|\brefund(?:able)?\s+ticket\b|\bcancel for free\b/i.test(text) ? 'refundable' : undefined;
  if (requestedCancellation) {
    const cancellation = normalizedFacts.get('cancellation') ?? UNKNOWN;
    if (cancellation.startsWith('Unknown') || !cancellation.toLowerCase().includes(requestedCancellation)
      || (requestedCancellation === 'refundable' && /non-refundable/i.test(cancellation))) return false;
  }

  const requestedTime = text.match(/\b(after|before|at|around|by)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (requestedTime) {
    const [, relation, rawHour, rawMinute = '0', rawPeriod] = requestedTime;
    let targetHour = Number(rawHour);
    if (rawPeriod?.toLowerCase() === 'pm' && targetHour < 12) targetHour += 12;
    if (rawPeriod?.toLowerCase() === 'am' && targetHour === 12) targetHour = 0;
    const targetMinutes = targetHour * 60 + Number(rawMinute);
    const usesReturn = /\breturn\b.{0,24}\b(?:after|before|at|around|by)\b|\b(?:after|before|at|around|by)\b.{0,24}\breturn\b/i.test(text);
    const actualTime = normalizedFacts.get(usesReturn ? 'return departure' : 'outward departure') ?? UNKNOWN;
    const timeMatch = actualTime.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)\b/i);
    if (!timeMatch) return false;
    let actualHour = Number(timeMatch[1]);
    if (timeMatch[3].toLowerCase() === 'pm' && actualHour < 12) actualHour += 12;
    if (timeMatch[3].toLowerCase() === 'am' && actualHour === 12) actualHour = 0;
    const actualMinutes = actualHour * 60 + Number(timeMatch[2]);
    if (relation.toLowerCase() === 'after' && actualMinutes <= targetMinutes) return false;
    if (relation.toLowerCase() === 'before' && actualMinutes >= targetMinutes) return false;
    if (['at', 'around', 'by'].includes(relation.toLowerCase()) && actualMinutes !== targetMinutes) return false;
  }

  const requestedDates = [...text.matchAll(/\b(?:20\d{2}-\d{2}-\d{2}|(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2})\b/gi)].map(match => match[0]);
  for (const requested of requestedDates) {
    const normalized = requested.toLowerCase().replace(/^(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s*/, '').replace(/\s+/g, ' ');
    if (!allText.includes(normalized)) return false;
  }

  const route = routeParts(offer);
  const from = text.match(/\bfrom\s+([^,.;]+?)(?=\s+to\s+|$)/i)?.[1]?.trim();
  const to = text.match(/\bto\s+([^,.;]+?)(?=\s+(?:on|at|for|by|with)\b|[,.;]|$)/i)?.[1]?.trim();
  if (from && !route.start.toLowerCase().includes(from.toLowerCase())) return false;
  if (to && !route.destination.toLowerCase().includes(to.toLowerCase())) return false;

  const wantsAccess = /wheelchair|step[- ]free|accessible|mobility assistance|boarding assistance/i.test(text);
  if (wantsAccess) {
    const access = fact(offer, 'Access')?.toLowerCase() ?? '';
    if (!access || /not confirmed|unknown|must be requested separately|needs checking/i.test(access)) return false;
    if (/wheelchair/i.test(text) && !/wheelchair/i.test(access)) return false;
  }
  return true;
}

export const journeyProvider: Provider = {
  kind: 'journey' as const,
  requiredFields: ['fullName', 'email', 'accessNeeds'] as Array<keyof Profile>,
  actionLabel: 'Confirm test booking',
  consequences: [
    'This prepares a fictional journey ticket on the controlled test website.',
    'The selected fare and its restrictions apply; choosing a cheaper service does not change your requested route, date, mode, or access needs.',
    'No real ticket or payment is created.',
  ],
  async search(browser: JourneyBrowser, text: string): Promise<Offer[]> {
    const raw = await browser.readOffers('journey');
    const normalized = raw.map(normalizeJourneyOffer);
    if (new Set(normalized.map(offer => sourceOrigin(offer))).size > 1) {
      throw new Error('Journey offers came from different website origins.');
    }
    return normalized.filter(offer => matchesRequest(offer, text));
  },
};
