import { offerSchema, type Offer, type Provider } from '../../shared/schema.js';

type EventFact = Offer['facts'][number];
type EventDetail = Offer['details'][number];

const UNKNOWN = 'Unknown — not provided by this source.';

function known(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
    && !/^(?:unknown\b|no verified\b|not provided\b)/i.test(value.trim());
}

function completeness(value: string): EventFact['completeness'] {
  if (!known(value)) return 'unknown';
  return /unknown|not confirmed|needs checking|not provided|not been provided|not established|availability.*check/i.test(value) ? 'partial' : 'complete';
}

function validateSource(offer: Offer): string {
  let source: URL;
  try {
    source = new URL(offer.sourceUrl);
  } catch {
    throw new Error('Event offer has an invalid source URL.');
  }
  if (!offer.demo || source.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(source.hostname)
    || source.pathname !== '/fixture/event' || source.username || source.password) {
    throw new Error('Event offer is outside the controlled event test website.');
  }

  const relatedUrls = [
    ...offer.facts.flatMap((fact) => fact.sourceUrl ? [fact.sourceUrl] : []),
    ...offer.details.flatMap((detail) => detail.sourceUrl ? [detail.sourceUrl] : []),
    ...offer.images.flatMap((image) => [image.url, image.sourceUrl]),
  ];
  if (relatedUrls.some((value) => {
    try {
      const url = new URL(value);
      return url.origin !== source.origin || Boolean(url.username || url.password);
    } catch {
      return true;
    }
  })) throw new Error('Event information or images have a different source origin.');
  return source.origin;
}

function factValue(offer: Offer, ...labels: string[]): string | undefined {
  const wanted = new Set(labels.map((label) => label.toLowerCase()));
  return offer.facts.find((fact) => wanted.has(fact.label.trim().toLowerCase()) && known(fact.value))?.value;
}

function detailText(offer: Offer, pattern: RegExp): string | undefined {
  const texts = offer.details
    .filter((detail) => pattern.test(`${detail.title} ${detail.text}`))
    .map((detail) => detail.text.trim())
    .filter(Boolean);
  return texts.length ? texts.join(' ') : undefined;
}

function sourcedFacts(offer: Offer): EventFact[] {
  return offer.facts.map((fact) => ({
    ...fact,
    sourceUrl: fact.sourceUrl ?? offer.sourceUrl,
    completeness: completeness(fact.value) === 'complete' ? fact.completeness : completeness(fact.value),
  }));
}

function sourcedDetails(offer: Offer): EventDetail[] {
  return offer.details.map((detail) => ({
    ...detail,
    sourceUrl: detail.sourceUrl ?? offer.sourceUrl,
    completeness: completeness(detail.text) === 'complete' ? detail.completeness : completeness(detail.text),
  }));
}

function upsertFact(facts: EventFact[], offer: Offer, label: string, value: string | undefined, fallbackSource = offer.sourceUrl) {
  const existing = facts.find((fact) => fact.label.toLowerCase() === label.toLowerCase());
  const normalizedValue = value?.trim() || UNKNOWN;
  if (existing) {
    existing.sourceUrl ??= fallbackSource;
    if (!existing.value.trim()) existing.value = UNKNOWN;
    const detected = completeness(existing.value);
    if (detected !== 'complete') existing.completeness = detected;
    return;
  }
  facts.push({ label, value: normalizedValue, sourceUrl: fallbackSource, completeness: completeness(normalizedValue) });
}

function ticketQuantity(offer: Offer): string | undefined {
  const stated = factValue(offer, 'Ticket quantity', 'Quantity', 'Tickets');
  if (!stated) return undefined;
  const quantity = stated.match(/\b(\d+)\s+(?:adult|child|children|ticket|seat|person|people)/i);
  return quantity ? `${quantity[1]} (as stated in ${stated})` : undefined;
}

function ticketCategory(offer: Offer): string | undefined {
  const stated = factValue(offer, 'Ticket categories', 'Category', 'Ticket type', 'Tickets');
  if (!stated) return undefined;
  const category = stated.match(/\b(?:standard|general admission|vip|premium|balcony|floor|reserved)\b(?:\s+(?:seating|ticket))?/i)?.[0];
  return category ? `${category} (other available categories are not established)` : undefined;
}

function seatInformation(offer: Offer): string | undefined {
  const stated = factValue(offer, 'Seats', 'Seat', 'Seating');
  if (stated) return stated;
  const conditions = detailText(offer, /seat|seating/i);
  if (conditions && /allocated seating/i.test(conditions)) return 'Allocated seating; exact seat assignment is not provided.';
  return undefined;
}

function eventDate(offer: Offer): string | undefined {
  const stated = factValue(offer, 'Event date', 'Date', 'When');
  if (!stated) return undefined;
  const date = stated.match(/(?:(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day,?\s+)?(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?/i)?.[0];
  return date ? `${date}${/\b\d{4}\b/.test(date) ? '' : ' (year unknown)'}` : undefined;
}

function eventTime(offer: Offer): string | undefined {
  const stated = factValue(offer, 'Event time', 'Time', 'When');
  if (!stated) return undefined;
  const time = stated.match(/\b\d{1,2}:\d{2}\s*(?:AM|PM)?\b|\b\d{1,2}\s*(?:AM|PM)\b/i)?.[0];
  if (!time) return undefined;
  const zone = factValue(offer, 'Time zone', 'Timezone', 'Time zone name');
  return zone ? `${time} · ${zone}` : `${time} · time zone unknown`;
}

function perTicketPrice(offer: Offer): string | undefined {
  const explicit = factValue(offer, 'Price per ticket', 'Unit price', 'Ticket price');
  if (explicit) return explicit;
  const priceBreakdown = detailText(offer, /price breakdown|price per ticket/i);
  const explicitCalculation = priceBreakdown?.match(/\b\d+\s+tickets?\s*[×x]\s*(\$\s?\d+(?:\.\d{2})?)/i);
  if (explicitCalculation) return `${explicitCalculation[1]} per ticket (as stated in source breakdown)`;
  return undefined;
}

function cancellation(offer: Offer): string | undefined {
  const explicit = factValue(offer, 'Cancellation conditions', 'Cancellation', 'Refund');
  if (explicit) return /not been provided|not confirmed|unknown/i.test(explicit) ? undefined : explicit;
  const detail = detailText(offer, /cancel|cancellation|refund/i);
  return detail && !/refund (?:and transfer )?conditions have not been provided|cancellation conditions have not been provided|cancellation .*unknown/i.test(detail)
    ? detail
    : undefined;
}

function transfer(offer: Offer): string | undefined {
  const explicit = factValue(offer, 'Transfer conditions', 'Transfer policy');
  if (explicit) return /not been provided|not confirmed|unknown/i.test(explicit) ? undefined : explicit;
  const detail = detailText(offer, /transfer/i);
  return detail && !/transfer conditions have not been provided|transfer .*unknown/i.test(detail) ? detail : undefined;
}

function allCostsVerified(offer: Offer): boolean {
  const fees = factValue(offer, 'Fees', 'Booking fees', 'Taxes and fees');
  const total = factValue(offer, 'Confirmed total', 'Total cost', 'Total price');
  const hasCostUnknown = offer.unknownCosts.some((cost) => /fee|total|tax|cost|price/i.test(cost));
  return Boolean(fees && total && !hasCostUnknown);
}

/** Preserve provider content/provenance while exposing event decision fields as known, partial or unknown. */
export function normalizeEventOffer(input: unknown): Offer {
  const offer = offerSchema.parse(input);
  if (offer.kind !== 'event') throw new Error('Expected an event offer; received another kind.');
  validateSource(offer);

  const facts = sourcedFacts(offer);
  const details = sourcedDetails(offer);
  const date = eventDate(offer);
  const time = eventTime(offer);
  const venue = factValue(offer, 'Venue', 'Where', 'Location');
  const tickets = ticketQuantity(offer);
  const category = ticketCategory(offer);
  const seats = seatInformation(offer);
  const availability = factValue(offer, 'Availability', 'Ticket availability', 'Available tickets');
  const access = factValue(offer, 'Access information', 'Access', 'Accessibility');
  const unitPrice = perTicketPrice(offer);
  const fees = factValue(offer, 'Fees', 'Booking fees', 'Taxes and fees');
  const total = factValue(offer, 'Confirmed total', 'Total cost', 'Total price');

  upsertFact(facts, offer, 'Event date', date);
  upsertFact(facts, offer, 'Event time and time zone', time);
  upsertFact(facts, offer, 'Venue', venue);
  upsertFact(facts, offer, 'Ticket categories', category);
  upsertFact(facts, offer, 'Ticket quantity', tickets);
  upsertFact(facts, offer, 'Seats', seats);
  upsertFact(facts, offer, 'Availability', availability);
  upsertFact(facts, offer, 'Access information', access);
  upsertFact(facts, offer, 'Price per ticket', unitPrice);
  upsertFact(facts, offer, 'Fees', fees);
  upsertFact(facts, offer, 'Confirmed total', total);
  upsertFact(facts, offer, 'Cancellation conditions', cancellation(offer));
  upsertFact(facts, offer, 'Transfer conditions', transfer(offer));
  upsertFact(facts, offer, 'Date year', date && /\b\d{4}\b/.test(date) ? date.match(/\b\d{4}\b/)?.[0] : undefined);

  if (!details.some((detail) => detail.title === 'Event matching limitations')) {
    details.push({
      title: 'Event matching limitations',
      text: 'This is a fixed fictional test listing, not a live event search. Only conditions stated in the listing have been checked. Date year, local time zone, ticket availability, exact seat allocation, final fees, cancellation and transfer conditions may be unknown; do not treat an unstated condition as satisfied.',
      sourceUrl: offer.sourceUrl,
      completeness: 'partial',
    });
  }

  const unknownCosts = [...offer.unknownCosts];
  if (!allCostsVerified(offer) && !unknownCosts.some((cost) => /fee|total|tax|cost/i.test(cost))) {
    unknownCosts.push('Event booking fees and confirmed final total are unknown');
  }

  return offerSchema.parse({ ...offer, facts, details, unknownCosts, completeness: 'partial' });
}

/**
 * The demo contains a fixed listing, so explicit constraints are only accepted when supported by
 * its text. A missing/ambiguous fact cannot be treated as a match.
 */
export function satisfiesExplicitConstraints(offer: Offer, taskText: string): boolean {
  const request = taskText.toLowerCase();
  const evidence = [offer.title, offer.subtitle, ...offer.facts.map(({ value }) => value), ...offer.details.map(({ text }) => text)]
    .join(' ')
    .toLowerCase();

  const dateRequests = request.match(/\b(?:\d{4}-\d{1,2}-\d{1,2}|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?)\b/gi) ?? [];
  if (dateRequests.some((date) => !containsNormalized(evidence, date))) return false;

  const locationRequest = taskText.match(/\b(?:in|at|near)\s+([A-Z][\w'-]*(?:\s+[A-Z][\w'-]*){0,3})/);
  if (locationRequest && !containsNormalized(evidence, locationRequest[1])) return false;

  const accessRequested = /\b(?:wheelchair|step[- ]?free|accessible|mobility access|aisle seat|companion seat)\b/i.test(taskText);
  if (accessRequested && !hasVerifiedAccess(offer, taskText)) return false;

  const seatRequested = /\b(?:front[- ]row|back[- ]row|aisle|window|specific seats?|together|adjacent seats?)\b/i.test(taskText);
  if (seatRequested && !hasVerifiedSeatMatch(offer, taskText)) return false;

  const countRequest = taskText.match(/\b(\d+)\s+(?:tickets?|seats?|people|persons?|adults?|children|child)\b/i);
  if (countRequest) {
    const quantity = factValue(offer, 'Ticket quantity', 'Quantity', 'Tickets') ?? '';
    if (!new RegExp(`\\b${countRequest[1]}\\b`).test(quantity)) return false;
  }

  return true;
}

function hasVerifiedAccess(offer: Offer, taskText: string): boolean {
  const access = (factValue(offer, 'Access information', 'Access', 'Accessibility') ?? '').toLowerCase();
  if (!access || /unknown|not confirmed|needs checking|not provided|may be unknown/.test(access)) return false;
  const requested = taskText.toLowerCase().match(/\b(?:wheelchair|step[- ]?free|accessible|mobility access|aisle seat|companion seat)\b/i)?.[0];
  return requested ? containsNormalized(access, requested) : false;
}

function hasVerifiedSeatMatch(offer: Offer, taskText: string): boolean {
  const seats = (factValue(offer, 'Seats', 'Seat', 'Seating') ?? '').toLowerCase();
  if (!seats || /unknown|not confirmed|needs checking/.test(seats)) return false;
  const requested = taskText.toLowerCase().match(/\b(?:front[- ]row|back[- ]row|aisle|window|together|adjacent seats?)\b/i)?.[0];
  return requested ? containsNormalized(seats, requested) : false;
}

function containsNormalized(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().replace(/[^a-z0-9]+/g, ' ').includes(needle.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
}

export const eventProvider: Provider = {
  kind: 'event',
  requiredFields: ['fullName', 'email'],
  actionLabel: 'Confirm test booking',
  consequences: [
    'This prepares a booking on a controlled fictional test website only.',
    'It does not create a real ticket or charge a payment method.',
    'Displayed ticket prices are not a confirmed total when fees or other costs remain unknown.',
  ],
  async search(browser, text): Promise<Offer[]> {
    const offers = offerSchema.array().parse(await browser.readOffers('event'));
    const normalized = offers.map((offer) => {
      if (offer.kind !== 'event') throw new Error('Event provider received an offer of another kind.');
      return normalizeEventOffer(offer);
    });
    if (new Set(normalized.map((offer) => new URL(offer.sourceUrl).origin)).size > 1) {
      throw new Error('Event offers came from different website origins.');
    }
    return normalized.filter((offer) => satisfiesExplicitConstraints(offer, text));
  },
};
