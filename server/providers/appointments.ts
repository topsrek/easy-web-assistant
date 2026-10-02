import { offerSchema, type Offer, type Provider } from '../../shared/schema.js';

type AppointmentFact = Offer['facts'][number];
type AppointmentDetail = Offer['details'][number];

const MISSING = 'Unknown — not provided by this source.';

const known = (value: string) => Boolean(value.trim()) && !/^(?:unknown\b|no verified\b|not provided\b)/i.test(value.trim());

function completeness(value: string): AppointmentFact['completeness'] {
  if (!known(value)) return 'unknown';
  return /unknown|not confirmed|not (?:been )?verified|needs checking|further access needs|must be requested/i.test(value) ? 'partial' : 'complete';
}

function validateSource(offer: Offer) {
  const source = new URL(offer.sourceUrl);
  if (!offer.demo || source.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(source.hostname)
    || source.pathname !== '/fixture/appointment' || source.username || source.password) {
    throw new Error('Appointment offer is outside the controlled appointment test website.');
  }
  const relatedUrls = [
    ...offer.facts.flatMap(fact => fact.sourceUrl ? [fact.sourceUrl] : []),
    ...offer.details.flatMap(detail => detail.sourceUrl ? [detail.sourceUrl] : []),
    ...offer.images.flatMap(image => [image.url, image.sourceUrl]),
  ];
  if (relatedUrls.some(value => {
    const url = new URL(value);
    return url.origin !== source.origin || Boolean(url.username || url.password);
  })) throw new Error('Appointment information or images have a different source origin.');
  return source.origin;
}

function factValue(offer: Offer, ...labels: string[]): string | undefined {
  const wanted = new Set(labels.map(label => label.toLowerCase()));
  return offer.facts.find(fact => wanted.has(fact.label.trim().toLowerCase()) && known(fact.value))?.value;
}

function detailText(offer: Offer, ...terms: string[]): string | undefined {
  const found = offer.details
    .filter(detail => terms.some(term => `${detail.title} ${detail.text}`.toLowerCase().includes(term)))
    .map(detail => detail.text.trim())
    .filter(Boolean);
  return found.length ? found.join(' ') : undefined;
}

function insuranceText(offer: Offer): string | undefined {
  const found = offer.details
    .filter(detail => /insurance|coverage/i.test(detail.title))
    .map(detail => detail.text.trim())
    .filter(Boolean);
  return found.length ? found.join(' ') : undefined;
}

function upsertFact(facts: AppointmentFact[], offer: Offer, label: string, value: string | undefined) {
  const existing = facts.find(fact => fact.label.toLowerCase() === label.toLowerCase());
  const normalizedValue = value?.trim() || MISSING;
  if (existing) {
    existing.sourceUrl ??= offer.sourceUrl;
    if (!existing.value.trim()) existing.value = MISSING;
    const detected = completeness(existing.value);
    if (detected !== 'complete') existing.completeness = detected;
    return;
  }
  facts.push({ label, value: normalizedValue, sourceUrl: offer.sourceUrl, completeness: completeness(normalizedValue) });
}

/** Preserve a provider offer and make appointment decision fields explicit without interpreting medical needs. */
export function normalizeAppointmentOffer(input: unknown): Offer {
  const offer = offerSchema.parse(input);
  if (offer.kind !== 'appointment') throw new Error('Expected an appointment offer.');
  validateSource(offer);

  const facts: AppointmentFact[] = offer.facts.map(fact => ({
    ...fact,
    sourceUrl: fact.sourceUrl ?? offer.sourceUrl,
    completeness: completeness(fact.value) === 'complete' ? fact.completeness : completeness(fact.value),
  }));
  const details: AppointmentDetail[] = offer.details.map(detail => ({
    ...detail,
    sourceUrl: detail.sourceUrl ?? offer.sourceUrl,
    completeness: completeness(detail.text) === 'complete' ? detail.completeness : completeness(detail.text),
  }));

  const care = factValue(offer, 'Care', 'Specialty', 'Department');
  const practice = offer.provider.trim() || MISSING;
  const when = factValue(offer, 'When', 'Appointment', 'Date and time');
  const address = factValue(offer, 'Where', 'Address', 'Location');
  const access = factValue(offer, 'Access', 'Accessibility');
  const prerequisites = detailText(offer, 'before your visit', 'prerequisite', 'bring', 'required');
  const cost = offer.price === null ? MISSING : `${offer.priceLabel} (listed amount; any other costs are not implied to be included)`;
  const insurance = insuranceText(offer) ?? MISSING;
  const cancellation = detailText(offer, 'cancel', 'cancellation') ?? MISSING;
  const changes = detailText(offer, 'reschedule', 'change', 'changing') ?? MISSING;

  upsertFact(facts, offer, 'Practice', practice);
  upsertFact(facts, offer, 'Practitioner', factValue(offer, 'Practitioner', 'Clinician', 'Provider') ?? MISSING);
  upsertFact(facts, offer, 'Specialty', factValue(offer, 'Specialty', 'Department') ?? care?.split(/\s*·\s*/)[0] ?? MISSING);
  upsertFact(facts, offer, 'Address', address ?? MISSING);
  upsertFact(facts, offer, 'Visit type', care?.match(/\b(in person|phone|video|virtual|telehealth)\b/i)?.[0] ?? MISSING);
  upsertFact(facts, offer, 'Appointment', when ?? MISSING);
  upsertFact(facts, offer, 'Duration', factValue(offer, 'Length', 'Duration') ?? MISSING);
  upsertFact(facts, offer, 'Access', access ?? MISSING);
  upsertFact(facts, offer, 'Prerequisites', prerequisites ?? MISSING);
  upsertFact(facts, offer, 'Cost', cost);
  upsertFact(facts, offer, 'Insurance', insurance);
  upsertFact(facts, offer, 'Cancellation', cancellation);
  upsertFact(facts, offer, 'Changes', changes);
  upsertFact(facts, offer, 'Time zone', factValue(offer, 'Time zone') ?? MISSING);
  upsertFact(facts, offer, 'Date year', factValue(offer, 'Date year') ?? MISSING);
  upsertFact(facts, offer, 'Fees', factValue(offer, 'Fees') ?? MISSING);
  upsertFact(facts, offer, 'Total cost', factValue(offer, 'Total cost') ?? MISSING);
  upsertFact(facts, offer, 'Original images', offer.images.length ? `${offer.images.length} original test-provider image(s).` : MISSING);
  upsertFact(facts, offer, 'Search limitations', 'Fixed fictional demo slots only. Requested date, location, specialty, visit type and access requirements have not been verified as matched. Real availability is unknown.');

  const unknownCosts = [...offer.unknownCosts];
  if (offer.price === null && !unknownCosts.some(item => /cost|price|fee/i.test(item))) {
    unknownCosts.push('Appointment cost and fees are unknown.');
  }
  if (offer.price !== null && /unknown|not confirmed|not provided/i.test(offer.priceLabel) && !unknownCosts.length) {
    unknownCosts.push('The listed price is not confirmed as the complete visit cost.');
  }
  if (!factValue(offer, 'Fees', 'Total cost') && !unknownCosts.some(item => /fee|total/i.test(item))) {
    unknownCosts.push('Fees and the complete visit cost are unknown.');
  }

  if (!details.some(detail => detail.title === 'Appointment matching limitations')) {
    details.push({
      title: 'Appointment matching limitations',
      text: 'These fixed fictional demo slots are not a live practice search. They do not establish a match for requested date, location, specialty, visit type, or access requirements. Review each slot; unstated requirements remain unknown. Year and time zone are unknown unless explicitly supplied by the source.',
      sourceUrl: offer.sourceUrl,
      completeness: 'partial',
    });
  }

  if (!details.some(detail => /appointment organization only\. it does not provide diagnosis, treatment recommendations, or medical advice\./i.test(detail.text))) {
    details.push({
      title: 'Scope of this assistant',
      text: 'This is appointment organization only. It does not provide diagnosis, treatment recommendations, or medical advice.',
      sourceUrl: offer.sourceUrl,
      completeness: 'complete',
    });
  }

  return offerSchema.parse({ ...offer, facts, details, unknownCosts, completeness: 'partial' });
}

const normalizedWords = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const containsWords = (value: string, requested: string) => (` ${normalizedWords(value)} `).includes(` ${normalizedWords(requested)} `);
const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

function minutes(hour: string, minute = '0', period?: string): number | undefined {
  const h = Number(hour), m = Number(minute);
  if (m > 59 || h > 23 || (period && (h < 1 || h > 12))) return undefined;
  // A requested 1–12 hour without AM/PM is ambiguous; do not guess a time of day.
  if (!period && h <= 12) return undefined;
  return (period ? h % 12 + (/pm/i.test(period) ? 12 : 0) : h) * 60 + m;
}

/** Compare only explicitly requested organizational conditions with source facts, never symptoms. */
function satisfiesAppointmentConstraints(offer: Offer, task: string): boolean {
  const when = factValue(offer, 'Appointment', 'When') ?? '';
  const date = when.match(/\b([a-z]+)\s+(\d{1,2})\b/i);
  const monthIndex = date ? months.findIndex(month => month.startsWith(date[1].toLowerCase())) : -1;
  const day = date ? Number(date[2]) : undefined;
  const year = factValue(offer, 'Date year') ?? when.match(/\b20\d{2}\b/)?.[0];
  // The fixed listings have no year/time zone, so relative dates cannot be verified.
  if (/\b(?:today|tomorrow|tonight|next\s+(?:week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|this\s+(?:week|weekend))\b/i.test(task)) return false;
  if (/\b\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?\b|\bon\s+\d{1,2}(?:st|nd|rd|th)?\b|\b(?:not|avoid|except|excluding)\b/i.test(task)) return false;
  if (/\b(?:after|before|by|between|from)\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(task)) return false;
  for (const requested of task.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)) {
    if (year !== requested[1] || monthIndex + 1 !== Number(requested[2]) || day !== Number(requested[3])) return false;
  }
  for (const requested of task.matchAll(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?\b/gi)) {
    const requestedMonth = months.findIndex(month => month.startsWith(requested[1].toLowerCase()));
    if (monthIndex !== requestedMonth || day !== Number(requested[2]) || (requested[3] && requested[3] !== year)) return false;
  }
  for (const requested of task.matchAll(/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi)) {
    if (!containsWords(when, requested[0])) return false;
  }

  const sourceTime = when.match(/\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/i);
  const time = sourceTime ? minutes(sourceTime[1], sourceTime[2], sourceTime[3]) : undefined;
  for (const requested of task.matchAll(/\b(morning|afternoon|evening|noon|midnight)\b/gi)) {
    if (time === undefined) return false;
    const period = requested[0].toLowerCase();
    if (period === 'morning' && !(time >= 360 && time < 720)) return false;
    if (period === 'afternoon' && !(time >= 720 && time < 1080)) return false;
    if (period === 'evening' && !(time >= 1080 && time < 1440)) return false;
    if (period === 'noon' && time !== 720 || period === 'midnight' && time !== 0) return false;
  }
  for (const requested of task.matchAll(/\b(?:(after|before|at)\s+)?(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/gi)) {
    const requestedTime = minutes(requested[2], requested[3], requested[4]);
    if (time === undefined || requestedTime === undefined) return false;
    const relation = requested[1]?.toLowerCase();
    if (relation === 'after' ? time <= requestedTime : relation === 'before' ? time >= requestedTime : time !== requestedTime) return false;
  }
  if (/\b(?:between|from)\s+\d.*\b(?:and|to)\s+\d/i.test(task)) return false;
  for (const requested of task.matchAll(/\b(?:after|before|at)\s+(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?(?=\s*(?:[,;.!?]|$|\b(?:on|in|at|for|with|after|before)\b))/gi)) {
    if (!requested[3]) return false;
  }
  if (/\b(?:after|before)\s+(?!\d{1,2}(?::\d{2})?\s*(?:AM|PM)\b)/i.test(task)) return false;
  for (const timezone of task.matchAll(/\b(?:UTC|GMT|PST|PDT|EST|EDT|CET|CEST)\b/gi)) {
    if (!containsWords(factValue(offer, 'Time zone') ?? '', timezone[0])) return false;
  }

  const specialty = factValue(offer, 'Specialty', 'Care') ?? '';
  const requestedSpecialties = task.match(/\b(?:general practitioner|primary care|family doctor|GP|dentist|dental|cardiologist|cardiology|dermatologist|dermatology|neurologist|neurology|orthop(?:a)?edic(?:s)?|pa?ediatric(?:ian|s)?|psychiatrist|psychiatry|psychologist|psychology|physiotherapist|physiotherapy|optometrist|ophthalmologist|gynaecologist|gynecologist|specialist|\w+(?:ologist|ology))\b/gi) ?? [];
  for (const requested of requestedSpecialties) {
    const general = /^(?:GP|general practitioner|primary care|family doctor)$/i.test(requested);
    if (!containsWords(specialty, general ? 'general practitioner' : requested)) return false;
  }

  const visitType = factValue(offer, 'Visit type') ?? '';
  for (const requested of task.matchAll(/\b(?:in[- ]person|video|virtual|telehealth|online|remote|home visit|telephone|phone appointment|phone consultation|over the phone)\b/gi)) {
    const mode = requested[0].toLowerCase();
    const canonical = /^in[- ]person$/.test(mode) ? 'in person' : /phone|telephone/.test(mode) ? 'phone' : /home/.test(mode) ? 'home visit' : 'video';
    const sourceMode = /video|virtual|telehealth|online|remote/i.test(visitType) ? 'video' : /phone|telephone/i.test(visitType) ? 'phone' : normalizedWords(visitType);
    if (sourceMode !== canonical) return false;
  }

  const place = `${factValue(offer, 'Practice') ?? ''} ${factValue(offer, 'Address') ?? ''}`;
  if (/\b(?:another|different|other)\s+(?:clinic|practice|hospital)\b|\b(?:near me|nearby|within\s+\d+\s+(?:miles|kilometres|kilometers|km))\b/i.test(task)) return false;
  for (const requested of task.matchAll(/\b(?:in|near|at)\s+(.+?)(?=\s+(?:on|at|in|near|with|for|after|before|tomorrow|today)\b|[,;.!?]|$)/gi)) {
    const location = requested[1].trim().replace(/^(?:the|a|an)\s+/i, '');
    if (/^(?:local (?:practice|clinic|doctor)|person|morning|afternoon|evening|noon|midnight)\b/i.test(location)
      || /^\d{1,2}(?::\d{2})?\s*(?:AM|PM)?$/i.test(location)) continue;
    if (!containsWords(place, location)) return false;
  }
  for (const requested of task.matchAll(/\b([a-z][a-z'-]*(?:\s+[a-z][a-z'-]*){0,3}\s+(?:clinic|practice|hospital|medical centre|medical center))\b/gi)) {
    const clinic = requested[1].split(/\b(?:at|in|near|with|from|for)\s+/i).at(-1)!
      .replace(/^(?:Find|Book|Choose|Schedule)\s+/i, '').replace(/^(?:the|a|an)\s+/i, '').trim();
    if (/^(?:(?:local|general|medical)\s+)?(?:clinic|practice)$/i.test(clinic)) continue;
    if (!containsWords(place, clinic)) return false;
  }
  if (/\bhospital\b/i.test(task) && !containsWords(place, 'hospital')) return false;
  for (const requested of task.matchAll(/\bDr\.?\s+([a-z'-]+(?:\s+[a-z'-]+)?)/gi)) {
    if (!containsWords(factValue(offer, 'Practitioner') ?? '', requested[1])) return false;
  }

  const accessRequested = task.match(/\b(?:wheelchair|step[- ]free|accessible|hearing loop|sign language)\b/gi) ?? [];
  if (accessRequested.length) {
    const access = offer.facts.find(fact => fact.label === 'Access');
    if (!access || access.completeness !== 'complete' || !known(access.value)) return false;
    if (accessRequested.some(requested => !containsWords(access.value, requested))) return false;
  }
  return true;
}

export const appointmentProvider: Provider = {
  kind: 'appointment',
  requiredFields: ['fullName', 'email', 'phone', 'accessNeeds'],
  actionLabel: 'Confirm test booking',
  consequences: [
    'This prepares a booking on a fictional test website only.',
    'No real practice is contacted and no medical advice is provided.',
    'Visit cost and insurance coverage remain unknown unless the source states otherwise.',
  ],
  async search(browser, text): Promise<Offer[]> {
    const offers = await browser.readOffers('appointment');
    const normalized = offers.map(normalizeAppointmentOffer);
    if (new Set(normalized.map(offer => new URL(offer.sourceUrl).origin)).size > 1) {
      throw new Error('Appointment offers came from different website origins.');
    }
    const primary = normalized.find(offer => offer.details.some(detail => /cancel or reschedule at least 24 hours beforehand/i.test(detail.text)));
    if (primary?.demo && primary.details.some(detail => /cancel or reschedule at least 24 hours beforehand/i.test(detail.text))) {
      for (const alternative of normalized.filter(offer => offer !== primary)) {
        const saysSameConditions = alternative.details.some(detail => /same .*conditions apply/i.test(detail.text));
        if (!saysSameConditions || alternative.provider !== primary.provider || alternative.sourceUrl !== primary.sourceUrl) continue;
        const primaryFacts = new Map(primary.facts.map(fact => [fact.label, fact.value]));
        const facts = alternative.facts.map(fact => ({ ...fact }));
        for (const label of ['Prerequisites', 'Insurance', 'Cancellation', 'Changes']) {
          const value = primaryFacts.get(label);
          const existing = facts.find(fact => fact.label === label);
          if (value && known(value) && existing && !known(existing.value)) {
            existing.value = `Same test-practice terms as the other offered slot: ${value}`;
            existing.completeness = completeness(value);
          }
        }
        normalized[normalized.indexOf(alternative)] = offerSchema.parse({ ...alternative, facts });
      }
    }
    return normalized.filter(offer => satisfiesAppointmentConstraints(offer, text));
  },
};
