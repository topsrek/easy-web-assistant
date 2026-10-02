import { createHash } from 'node:crypto';
import { offerSchema, type Offer, type TaskKind } from '../../shared/schema.js';
import { permittedUrl } from './policy.js';
import type { WebsiteObservation, WebsitePolicy } from './types.js';

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
const string = (value: unknown, max = 500): string => typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';
const name = (value: unknown) => string(value) || string(record(value).name);
const array = (value: unknown): unknown[] => value === undefined ? [] : Array.isArray(value) ? value : [value];

function events(value: unknown, depth = 0): RecordValue[] {
  if (depth > 8) return [];
  if (Array.isArray(value)) return value.slice(0, 100).flatMap((entry) => events(entry, depth + 1));
  const node = record(value);
  const types = array(node['@type']);
  if (types.some((type) => typeof type === 'string' && /^(?:Music|Theater|Dance|Education)?Event$/.test(type))) return [node];
  return ['@graph', 'itemListElement', 'item', 'mainEntity', 'subEvent'].flatMap((key) => events(node[key], depth + 1));
}

/** Values are copied from observed provider data; models do not write offer facts. */
export function extractWebsiteOffers(observation: WebsiteObservation, policy: WebsitePolicy, kind: TaskKind): Offer[] {
  const nodes = observation.structuredData.flatMap((value) => events(value)).slice(0, 20);
  const knownNodes = nodes.filter((node) => string(node.name));
  // A detail page without structured data remains a partial source reading, never an invented event.
  const fallback = knownNodes.length === 0 && observation.url !== policy.startUrl && observation.title && observation.text.trim();
  const candidates: RecordValue[] = knownNodes.length ? knownNodes : fallback ? [{ name: observation.title }] : [];
  return candidates.flatMap((node, index) => {
    const sourceUrl = observation.url;
    const title = string(node.name);
    const ticket = record(array(node.offers)[0]);
    const currency = ['USD', 'EUR', 'GBP'].includes(string(ticket.priceCurrency)) ? string(ticket.priceCurrency) as Offer['currency'] : 'USD';
    const statedPrice = typeof ticket.price === 'number' ? ticket.price : typeof ticket.price === 'string' && /^\d+(?:\.\d+)?$/.test(ticket.price) ? Number(ticket.price) : null;
    // A listed ticket price is a component, not a verified total including fees/quantity.
    const price = statedPrice !== null && Number.isFinite(statedPrice) && statedPrice >= 0 && string(ticket.priceCurrency) ? statedPrice : null;
    const place = record(node.location);
    const address = record(place.address);
    const description = string(node.description, 6000);
    const facts: Offer['facts'] = [
      { label: 'Start', value: string(node.startDate) || 'Not established by the source reading', sourceUrl, completeness: node.startDate ? 'partial' : 'unknown' },
      { label: 'Venue', value: name(node.location) || 'Not established by the source reading', sourceUrl, completeness: name(node.location) ? 'partial' : 'unknown' },
      { label: 'Availability', value: string(ticket.availability) || 'Not checked; no reservation was made', sourceUrl, completeness: string(ticket.availability) ? 'partial' : 'unknown' },
      { label: 'Request conditions', value: 'This is a source reading. Dates, price limits, access requirements and ticket variants still need checking.', sourceUrl, completeness: 'partial' },
    ];
    const addressText = [address.streetAddress, address.addressLocality, address.postalCode, name(address.addressCountry)].map((value) => string(value)).filter(Boolean).join(', ');
    if (addressText) facts.push({ label: 'Address', value: addressText, sourceUrl, completeness: 'partial' });
    const imageValues = array(node.image).map((value) => string(value, 2000) || string(record(value).url, 2000)).filter(Boolean);
    const sourcedImages = imageValues.length ? imageValues.flatMap((url) => {
      try { return [{ url: new URL(url, observation.url).href, alt: title }]; } catch { return []; }
    }) : observation.images.filter((image) => image.alt && image.alt.toLowerCase().includes(title.toLowerCase()));
    const images = sourcedImages
      .filter((image) => permittedUrl(image.url, policy, false)).slice(0, 30).map((image) => ({ ...image, sourceUrl: observation.url }));
    const offer = {
      id: `web-${createHash('sha256').update(`${observation.url}:${title}:${index}`).digest('hex').slice(0, 24)}`,
      kind, title, provider: policy.provider, subtitle: 'Public website information · conditions need checking',
      price, currency, priceLabel: price === null ? 'Price and total cost not established' : `${currency} ${price.toFixed(2)} listed price; final total not checked`,
      unknownCosts: ['Fees, ticket quantity, final total and cancellation conditions are not verified'], facts,
      details: [
        ...(description ? [{ title: 'Provider description', text: description, sourceUrl, completeness: 'partial' as const }] : []),
        ...Array.from({ length: Math.ceil(observation.text.length / 6000) }, (_, offset) => ({ title: `Observed page text ${offset + 1}`, text: observation.text.slice(offset * 6000, (offset + 1) * 6000), sourceUrl: observation.url, completeness: 'partial' as const })),
      ], images, sourceUrl, observedAt: observation.observedAt, demo: false,
      selectLabel: 'Read source details', completeness: 'partial',
    };
    const checked = offerSchema.safeParse(offer);
    return checked.success ? [checked.data] : [];
  });
}
