import { z } from 'zod/v3';

export const CATALOG_ID = 'https://easy-web-assistant.local/catalogs/everyday-v1.json';
const short = z.string().max(500);
export const profileSchema = z.object({
  fullName: short.default(''), email: z.string().max(254).default(''), phone: short.default(''),
  street: short.default(''), city: short.default(''), postalCode: short.default(''), country: short.default(''),
  deliveryAddress: short.default(''), billingAddress: short.default(''),
  homeStation: short.default(''), accessNeeds: short.default(''), appointmentPreference: short.default(''),
}).strict();
export type Profile = z.infer<typeof profileSchema>;
export const emptyProfile = profileSchema.parse({});
export const kindSchema = z.enum(['event', 'journey', 'appointment', 'government', 'service', 'leisure']);
export type TaskKind = z.infer<typeof kindSchema>;
export const neededProfileFor = (kind: TaskKind, profile: Profile, options: { homeVisit?: boolean } = {}): Profile => {
  const fields: (keyof Profile)[] = kind === 'journey'
    ? ['fullName', 'email', 'accessNeeds']
    : kind === 'appointment'
      ? ['fullName', 'email', 'phone', 'accessNeeds']
      : kind === 'service'
        ? ['fullName', 'email', 'phone', ...(options.homeVisit ? ['street', 'city', 'postalCode'] as const : [])]
        : ['fullName', 'email'];
  return profileSchema.parse(Object.fromEntries(fields.map((field) => [field, profile[field]])));
};
export const imageSchema = z.object({ url: z.string().url(), alt: short, sourceUrl: z.string().url() }).strict();
const provenanceSchema = z.object({ label: short, value: z.string().max(3000), sourceUrl: z.string().url().optional(), completeness: z.enum(['complete', 'partial', 'unknown']).default('complete') }).strict();
export const offerSchema = z.object({
  id: z.string().min(1).max(100), kind: kindSchema, title: short, provider: short, subtitle: short,
  price: z.number().nonnegative().nullable(), currency: z.enum(['USD', 'EUR', 'GBP']),
  priceLabel: short, unknownCosts: z.array(short).max(50),
  facts: z.array(provenanceSchema).max(100),
  details: z.array(z.object({ title: short, text: z.string().max(6000), sourceUrl: z.string().url().optional(), completeness: z.enum(['complete', 'partial', 'unknown']).default('complete') }).strict()).max(100),
  images: z.array(imageSchema).max(100), sourceUrl: z.string().url(), observedAt: z.string().datetime({ offset: true }),
  demo: z.boolean(), selectLabel: short, completeness: z.enum(['complete', 'partial', 'unknown']).default('complete'),
}).strict();
export type Offer = z.infer<typeof offerSchema>;

export interface BrowserOfferReader { readOffers(kind: TaskKind): Promise<Offer[]> }
export interface Provider {
  kind: TaskKind;
  search(browser: BrowserOfferReader, text: string): Promise<Offer[]>;
  requiredFields: Array<keyof Profile>;
  actionLabel: string;
  consequences: string[];
}

export const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('task'), text: z.string().trim().min(1).max(6000), profile: profileSchema }).strict(),
  z.object({ type: z.literal('select'), offerId: z.string().min(1).max(100), version: z.number().int().nonnegative(), profile: profileSchema.optional() }).strict(),
  z.object({ type: z.literal('confirm'), token: z.string().min(1).max(1000), version: z.number().int().nonnegative(), profile: profileSchema }).strict(),
  z.object({ type: z.literal('profile_changed'), profile: profileSchema.optional() }).strict(),
  z.object({ type: z.literal('stop') }).strict(),
  z.object({ type: z.literal('reset') }).strict(),
  z.object({ type: z.literal('voice_start') }).strict(),
  z.object({ type: z.literal('voice_stop') }).strict(),
  z.object({ type: z.literal('audio'), data: z.string().min(1).max(100000).regex(/^[A-Za-z0-9+/]+=*$/) }).strict(),
]);
export type ClientMessage = z.infer<typeof clientMessageSchema>;

const id = z.string().min(1).max(200);
const transmittedFieldSchema = z.object({ label: z.string().trim().min(1).max(200), value: z.string().max(3000) }).strict();
export const serverEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready'), mode: z.enum(['demo', 'live']), voiceAvailable: z.boolean() }).strict(),
  z.object({ type: z.literal('message'), id, role: z.enum(['assistant', 'user']), text: z.string().max(12000) }).strict(),
  z.object({ type: z.literal('cards'), id, messages: z.array(z.unknown()).max(100), version: z.number().int().nonnegative() }).strict(),
  z.object({ type: z.literal('status'), text: z.string().max(12000), state: z.enum(['idle', 'working', 'paused', 'waiting', 'complete']), version: z.number().int().nonnegative(), phase: z.enum(['prepared', 'submitted', 'confirmed', 'unclear']).optional() }).strict(),
  z.object({ type: z.literal('browser'), image: z.string().regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/), url: z.string().url(), updatedAt: z.string().datetime({ offset: true }), demo: z.boolean() }).strict(),
  z.object({ type: z.literal('approval'), id, offer: offerSchema, token: z.string().min(1).max(1000), version: z.number().int().nonnegative(), expiresAt: z.number().int().positive(), transmittedFields: z.array(transmittedFieldSchema).max(30), actionLabel: z.string().trim().min(1).max(300), consequences: z.array(z.string().trim().min(1).max(1000)).min(1).max(30), action: z.string().trim().min(1).max(300), site: z.string().trim().min(1).max(500) }).strict(),
  z.object({ type: z.literal('result'), id, state: z.enum(['confirmed', 'unclear']), text: z.string().max(12000), reference: z.string().max(500).optional(), demo: z.boolean(), outcome: z.enum(['booking_confirmed', 'request_received']).optional(), kind: kindSchema.optional(), version: z.number().int().nonnegative().optional(), offerId: z.string().min(1).max(100).optional() }).strict(),
  z.object({ type: z.literal('error'), message: z.string().min(1).max(4000) }).strict(),
  z.object({ type: z.literal('voice'), state: z.enum(['connected', 'closed', 'interrupted']) }).strict(),
  z.object({ type: z.literal('audio'), data: z.string().min(1).max(100000).regex(/^[A-Za-z0-9+/]+=*$/) }).strict(),
  z.object({ type: z.literal('transcript'), role: z.enum(['user', 'assistant']), text: z.string().max(12000), final: z.boolean(), id: z.string().min(1).max(200).optional() }).strict(),
]);
export type ServerEvent = z.infer<typeof serverEventSchema>;

export function buildOfferSurface(offer: Offer, version: number, id: string) {
  const component = offer.kind === 'event' || offer.kind === 'leisure' ? offer.kind === 'event' ? 'EventCard' : 'LeisureCard'
    : offer.kind === 'journey' ? 'JourneyCard'
      : offer.kind === 'appointment' ? 'AppointmentCard'
        : offer.kind === 'government' ? 'GovernmentCard' : 'ServiceCard';
  return [
    { version: 'v0.9', createSurface: { surfaceId: id, catalogId: CATALOG_ID } },
    { version: 'v0.9', updateComponents: { surfaceId: id, components: [{ id: 'root', component, offer, disabled: { path: '/disabled' }, onSelect: { event: { name: 'select_offer', context: { offerId: offer.id, version } } } }] } },
    { version: 'v0.9', updateDataModel: { surfaceId: id, path: '/', value: { disabled: false } } },
  ];
}
