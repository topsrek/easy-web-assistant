import { offerSchema, type Offer, type Provider } from '../../shared/schema.js';

type ServiceFact = Offer['facts'][number];
type ServiceDetail = Offer['details'][number];

const MISSING = 'Unknown — not provided by this source.';
const known = (value: string) => Boolean(value.trim()) && !/^(?:unknown\b|not provided\b|not verified\b)/i.test(value.trim());

function completeness(value: string): ServiceFact['completeness'] {
  if (!known(value)) return 'unknown';
  return /unknown|not confirmed|not verified|needs checking|needs confirmation|subject to|estimate only|varies/i.test(value) ? 'partial' : 'complete';
}

function validateSource(offer: Offer): string {
  let source: URL;
  try { source = new URL(offer.sourceUrl); } catch { throw new Error('Service offer has an invalid source URL.'); }
  if (!offer.demo || source.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(source.hostname)
    || source.pathname !== '/fixture/service' || source.username || source.password) {
    throw new Error('Service offer is outside the controlled service test website.');
  }
  const urls = [
    ...offer.facts.flatMap(fact => fact.sourceUrl ? [fact.sourceUrl] : []),
    ...offer.details.flatMap(detail => detail.sourceUrl ? [detail.sourceUrl] : []),
    ...offer.images.flatMap(image => [image.url, image.sourceUrl]),
  ];
  for (const value of urls) {
    let url: URL;
    try { url = new URL(value); } catch { throw new Error('Service offer contains an invalid source URL.'); }
    if (url.origin !== source.origin || url.username || url.password) throw new Error('Service information or images have a different source origin.');
  }
  return source.origin;
}

function factValue(offer: Offer, ...labels: string[]): string | undefined {
  const wanted = new Set(labels.map(label => label.toLowerCase()));
  return offer.facts.find(fact => wanted.has(fact.label.trim().toLowerCase()) && known(fact.value))?.value;
}

function detailText(offer: Offer, expression: RegExp): string | undefined {
  const values = offer.details.filter(detail => expression.test(`${detail.title} ${detail.text}`)).map(detail => detail.text.trim()).filter(Boolean);
  return values.length ? values.join(' ') : undefined;
}

function upsertFact(facts: ServiceFact[], offer: Offer, label: string, value: string | undefined): void {
  const existing = facts.find(fact => fact.label.toLowerCase() === label.toLowerCase());
  if (existing) {
    existing.sourceUrl ??= offer.sourceUrl;
    if (!existing.value.trim()) existing.value = MISSING;
    const detected = completeness(existing.value);
    if (detected !== 'complete') existing.completeness = detected;
    return;
  }
  const normalized = value?.trim() || MISSING;
  facts.push({ label, value: normalized, sourceUrl: offer.sourceUrl, completeness: completeness(normalized) });
}

/** Add explicit service decision fields while retaining the fictional provider's source material. */
export function normalizeServiceOffer(input: unknown): Offer {
  const offer = offerSchema.parse(input);
  if (offer.kind !== 'service') throw new Error('Expected a service offer.');
  validateSource(offer);

  const facts: ServiceFact[] = offer.facts.map(fact => ({
    ...fact,
    sourceUrl: fact.sourceUrl ?? offer.sourceUrl,
    completeness: completeness(fact.value) === 'complete' ? fact.completeness : completeness(fact.value),
  }));
  const details: ServiceDetail[] = offer.details.map(detail => ({
    ...detail,
    sourceUrl: detail.sourceUrl ?? offer.sourceUrl,
    completeness: completeness(detail.text) === 'complete' ? detail.completeness : completeness(detail.text),
  }));

  const service = factValue(offer, 'Service', 'Service scope', 'Work requested', 'Category');
  const provider = offer.provider.trim() || MISSING;
  const area = factValue(offer, 'Service area', 'Coverage area', 'Area');
  const window = factValue(offer, 'Time window', 'Appointment window', 'When', 'Availability');
  const location = factValue(offer, 'Visit type', 'Visit & location', 'Location', 'Address requirement', 'Service location');
  const prerequisites = detailText(offer, /prerequisite|requirement|before (?:the )?(?:visit|work)|preparation|access needed/i);
  const quoteBasis = factValue(offer, 'Price basis', 'Quote basis', 'Pricing basis', 'Estimate basis');
  const labour = factValue(offer, 'Labour', 'Labor', 'Hourly rate', 'Work charge', 'Labour / call-out / travel / materials');
  const callout = factValue(offer, 'Call-out', 'Callout', 'Service call', 'Assessment fee', 'Labour / call-out / travel / materials');
  const travel = factValue(offer, 'Travel', 'Travel charge', 'Travel fee', 'Labour / call-out / travel / materials');
  const materials = factValue(offer, 'Materials', 'Material cost', 'Parts', 'Labour / call-out / travel / materials');
  const otherCharges = factValue(offer, 'Other charges', 'Additional charges', 'Fees');
  const qualifications = factValue(offer, 'Qualifications', 'Credentials', 'Licensing', 'Availability & qualifications');
  const availability = factValue(offer, 'Provider availability', 'Availability', 'Availability & qualifications');
  const cancellation = detailText(offer, /cancel|cancellation/i) ?? factValue(offer, 'Cancellation');
  const dataDisclosure = detailText(offer, /data (?:use|sharing|disclosure)|information (?:used|shared)|privacy/i);

  upsertFact(facts, offer, 'Service', service);
  upsertFact(facts, offer, 'Provider', provider);
  upsertFact(facts, offer, 'Service area', area);
  upsertFact(facts, offer, 'Time window', window);
  upsertFact(facts, offer, 'Time zone', factValue(offer, 'Time zone') );
  upsertFact(facts, offer, 'Visit and location requirements', location);
  upsertFact(facts, offer, 'Prerequisites', prerequisites);
  upsertFact(facts, offer, 'Qualifications', qualifications);
  upsertFact(facts, offer, 'Availability', availability);
  upsertFact(facts, offer, 'Price basis', quoteBasis);
  upsertFact(facts, offer, 'Labour charge', labour);
  upsertFact(facts, offer, 'Call-out charge', callout);
  upsertFact(facts, offer, 'Travel charge', travel);
  upsertFact(facts, offer, 'Materials charge', materials);
  upsertFact(facts, offer, 'Other charges', otherCharges);
  upsertFact(facts, offer, 'Cancellation conditions', cancellation);
  upsertFact(facts, offer, 'Data disclosure', dataDisclosure);
  upsertFact(facts, offer, 'Listed price', offer.price === null ? undefined : `${offer.priceLabel} (listed component; not a verified total)`);
  upsertFact(facts, offer, 'Total cost', factValue(offer, 'Total cost', 'Complete total', 'Final total', 'Confirmed total'));
  upsertFact(facts, offer, 'Request vs engagement', factValue(offer, 'Request state', 'Request vs engagement'));
  upsertFact(facts, offer, 'Confirmation evidence', factValue(offer, 'Confirmation evidence'));
  upsertFact(facts, offer, 'Original images', offer.images.length ? `${offer.images.length} original fictional-provider image(s).` : undefined);
  upsertFact(facts, offer, 'Matching limitations', 'Fixed fictional demo offers only. Requested service, area, date, time window and location have not been verified as a match.');

  const unknownCosts = [...offer.unknownCosts];
  if (offer.price === null && !unknownCosts.some(item => /cost|price|charge|fee/i.test(item))) unknownCosts.push('Service charges and total cost are unknown.');
  if (!factValue(offer, 'Total cost', 'Complete total', 'Final total', 'Confirmed total') && !unknownCosts.some(item => /total/i.test(item))) unknownCosts.push('A complete service total is unknown; listed amounts may cover only part of the work.');
  if (![labour, callout, travel, materials, otherCharges].some(Boolean) && !unknownCosts.some(item => /charge|fee|price/i.test(item))) unknownCosts.push('Labour, call-out, travel, materials and other charges are not specified.');

  if (!details.some(detail => detail.title === 'Fixed demo matching limitations')) details.push({
    title: 'Fixed demo matching limitations',
    text: 'This is a fixed fictional test offer, not a live contractor search. The source does not verify a match for your requested service, area, date, time or visit location. Unstated qualifications and availability remain unknown.',
    sourceUrl: offer.sourceUrl,
    completeness: 'partial',
  });
  if (!details.some(detail => detail.title === 'Request outcome')) details.push({
    title: 'Request outcome',
    text: 'Submitting this test request only records a fictional inquiry. It does not hire a real contractor, accept a quote, confirm availability or schedule a visit. No binding service engagement is created.',
    sourceUrl: offer.sourceUrl,
    completeness: 'complete',
  });
  if (!details.some(detail => /street address is only needed/i.test(detail.text))) details.push({
    title: 'Data minimization',
    text: 'Only the disclosed name, email and phone are proposed for this test request. A street address is only needed when the source verifies that a home visit requires it and the Controller explicitly includes it in a current approval. No whole-profile transfer is implied.',
    sourceUrl: offer.sourceUrl,
    completeness: 'complete',
  });

  return offerSchema.parse({ ...offer, facts, details, unknownCosts, completeness: 'partial' });
}

const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const hasWords = (text: string, requested: string) => (` ${normalized(text)} `).includes(` ${normalized(requested)} `);

function satisfiesExplicitConstraints(offer: Offer, task: string): boolean {
  const searchable = [offer.title, offer.subtitle, ...offer.facts.map(fact => `${fact.label} ${fact.value}`)].join(' ');
  const requestedArea = task.match(/\b(?:in|near|around|within)\s+([A-Z][\w-]*(?:\s+[A-Z][\w-]*){0,2})/g) ?? [];
  for (const phrase of requestedArea) {
    const place = phrase.replace(/^\b(?:in|near|around|within)\s+/i, '');
    if (!hasWords(searchable, place)) return false;
  }
  if (/\b(?:today|tomorrow|tonight|next\s+(?:week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|this\s+(?:week|weekend)|\d{4}-\d{2}-\d{2})\b/i.test(task)) {
    const suppliedWindow = factValue(offer, 'Time window', 'Appointment window', 'When', 'Availability') ?? '';
    const date = task.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
    if (!suppliedWindow || date && !suppliedWindow.includes(date) || !date) return false;
  }
  return true;
}

export const serviceProvider: Provider = {
  kind: 'service',
  requiredFields: ['fullName', 'email', 'phone'],
  actionLabel: 'Submit test service request',
  consequences: [
    'This sends a fictional service inquiry to the local test provider.',
    'No real contractor is engaged, and a request does not confirm a visit, availability, quote or final total.',
    'Only the fields listed in this approval are sent; a home address requires a source-verified home visit and explicit Controller approval.',
  ],
  async search(browser, text) {
    const raw = await browser.readOffers('service');
    const origins = new Set<string>();
    const offers = raw.map(input => {
      const offer = normalizeServiceOffer(input);
      origins.add(new URL(offer.sourceUrl).origin);
      return offer;
    });
    if (origins.size > 1) throw new Error('Service offers are from different website origins.');
    return offers.map(offer => satisfiesExplicitConstraints(offer, text) ? offer : normalizeServiceOffer({
      ...offer,
      facts: [...offer.facts, { label: 'Requested constraints', value: 'No verified fixed-demo match for all requested service, place or time constraints. Review source details before proceeding.', sourceUrl: offer.sourceUrl, completeness: 'partial' }],
    }));
  },
};
