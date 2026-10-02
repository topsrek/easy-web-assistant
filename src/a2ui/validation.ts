import { A2uiMessageSchema } from '@a2ui/web_core/v0_9';
import type { A2uiMessage } from '@a2ui/web_core/v0_9';
import { offerSchema, type Offer } from '../../shared/schema';

const catalogId = 'https://easy-web-assistant.local/catalogs/everyday-v1.json';
const selectableNames = new Set([
  'EventCard', 'JourneyCard', 'AppointmentCard',
  'GovernmentCard', 'ServiceCard', 'LeisureCard', 'EverydayOffer',
]);
const componentNames = new Set([
  ...selectableNames,
  'ImageGallery', 'FormTextField', 'FormChoicePicker',
]);
const allowedProps: Record<string, readonly string[]> = {
  EventCard: ['id', 'component', 'offer', 'disabled', 'onSelect'],
  JourneyCard: ['id', 'component', 'offer', 'disabled', 'onSelect'],
  AppointmentCard: ['id', 'component', 'offer', 'disabled', 'onSelect'],
  GovernmentCard: ['id', 'component', 'offer', 'disabled', 'onSelect'],
  ServiceCard: ['id', 'component', 'offer', 'disabled', 'onSelect'],
  LeisureCard: ['id', 'component', 'offer', 'disabled', 'onSelect'],
  EverydayOffer: ['id', 'component', 'offer', 'disabled', 'onSelect'],
  ImageGallery: ['id', 'component', 'images', 'title'],
  FormTextField: ['id', 'component', 'label', 'value', 'placeholder', 'disabled'],
  FormChoicePicker: ['id', 'component', 'label', 'options', 'value', 'disabled'],
};
const maxMessages = 24;
const maxComponents = 80;
const maxArrayItems = 100;
const maxStringLength = 12_000;
const maxDepth = 12;
const forbiddenKeys = new Set(['html', 'javascript', 'script', 'href', 'srcdoc', 'onerror', 'onclick', 'onload', 'innerhtml', 'outerhtml']);

function boundedData(value: unknown, depth = 0): boolean {
  if (depth > maxDepth) return false;
  if (typeof value === 'string') return value.length <= maxStringLength && !/^\s*javascript:/i.test(value);
  if (typeof value === 'number') return Number.isFinite(value);
  if (value === null || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length <= maxArrayItems && value.every((item) => boundedData(item, depth + 1));
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    return entries.length <= 80 && entries.every(([key, item]) => !forbiddenKeys.has(key.toLowerCase()) && boundedData(item, depth + 1));
  }
  return false;
}

export type ValidatedA2UI = {
  messages: A2uiMessage[];
  selectableBySource: Map<string, { offerId: string; version: number; kind: Offer['kind'] }>;
};

function isSafeWebUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password;
  } catch {
    return false;
  }
}

function hasSafeOfferUrls(offer: Offer): boolean {
  return isSafeWebUrl(offer.sourceUrl)
    && offer.images.every((image) => isSafeWebUrl(image.url) && isSafeWebUrl(image.sourceUrl))
    && offer.facts.every((fact) => fact.sourceUrl === undefined || isSafeWebUrl(fact.sourceUrl))
    && offer.details.every((detail) => detail.sourceUrl === undefined || isSafeWebUrl(detail.sourceUrl));
}

/** Validate and bound the full declarative payload before it reaches MessageProcessor. */
export function validateA2UIMessages(input: unknown): ValidatedA2UI | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > maxMessages) return null;
  if (!boundedData(input)) return null;
  const parsed = A2uiMessageSchema.array().safeParse(input);
  if (!parsed.success || parsed.data.some((message) => message.version !== 'v0.9')) return null;

  let componentCount = 0;
  const surfaces = new Set<string>();
  const selectableBySource = new Map<string, { offerId: string; version: number; kind: Offer['kind'] }>();
  for (const message of parsed.data) {
    if ('createSurface' in message) {
      if (message.createSurface.catalogId !== catalogId || !message.createSurface.surfaceId || surfaces.has(message.createSurface.surfaceId)) return null;
      surfaces.add(message.createSurface.surfaceId);
      continue;
    }
    if ('deleteSurface' in message) {
      if (!surfaces.has(message.deleteSurface.surfaceId)) return null;
      surfaces.delete(message.deleteSurface.surfaceId);
      continue;
    }
    if ('updateComponents' in message) {
      const { surfaceId, components } = message.updateComponents;
      if (!surfaces.has(surfaceId)) return null;
      componentCount += components.length;
      if (componentCount > maxComponents) return null;
      const componentIds = new Set<string>();
      for (const component of components) {
        const { id, component: name } = component as { id?: unknown; component?: unknown };
        if (typeof id !== 'string' || id.length > 100 || !id || componentIds.has(id) || typeof name !== 'string' || !componentNames.has(name)) return null;
        componentIds.add(id);
        if (!boundedData(component)) return null;
        const knownProps = allowedProps[name];
        if (!knownProps || Object.keys(component).some((key) => !knownProps.includes(key))) return null;
        if (name === 'ImageGallery') {
          const images = (component as { images?: unknown }).images;
          const checkedImages = offerSchema.shape.images.safeParse(images);
          if (!checkedImages.success || !checkedImages.data.every((image) => isSafeWebUrl(image.url) && isSafeWebUrl(image.sourceUrl))) return null;
        }
        if (selectableNames.has(name)) {
          const offerValue = (component as { offer?: unknown }).offer;
          if (!offerValue || typeof offerValue !== 'object') return null;
          const checkedOffer = offerSchema.safeParse(offerValue);
          if (!checkedOffer.success || !hasSafeOfferUrls(checkedOffer.data)) return null;
          const record = checkedOffer.data;
          const disabledBinding = (component as { disabled?: unknown }).disabled;
          if (!disabledBinding || typeof disabledBinding !== 'object' || (disabledBinding as { path?: unknown }).path !== '/disabled' || Object.keys(disabledBinding).length !== 1) return null;
          const rawAction = (component as { onSelect?: unknown }).onSelect;
          if (!rawAction || typeof rawAction !== 'object' || Object.keys(rawAction).length !== 1) return null;
          const rawEvent = (rawAction as { event?: unknown }).event;
          if (!rawEvent || typeof rawEvent !== 'object' || Object.keys(rawEvent).some((key) => key !== 'name' && key !== 'context')) return null;
          const action = rawAction as { event?: { name?: unknown; context?: Record<string, unknown> } };
          const context = action?.event?.context;
          if (action?.event?.name !== 'select_offer' || !context || typeof context.offerId !== 'string'
            || !Number.isSafeInteger(context.version) || (context.version as number) < 0 || context.offerId !== record.id) return null;
          if (Object.keys(context).some((key) => key !== 'offerId' && key !== 'version')) return null;
          const expectedKinds: Record<string, string> = {
            EventCard: 'event',
            JourneyCard: 'journey',
            AppointmentCard: 'appointment',
            GovernmentCard: 'government',
            ServiceCard: 'service',
            LeisureCard: 'leisure',
          };
          if (name === 'EverydayOffer') {
            if (record.kind !== 'event' && record.kind !== 'journey' && record.kind !== 'appointment') return null;
          } else if (record.kind !== expectedKinds[name]) {
            return null;
          }
          const sourceKey = `${surfaceId}\u0000${id}`;
          if (selectableBySource.has(sourceKey)) return null;
          selectableBySource.set(sourceKey, {
            offerId: context.offerId,
            version: context.version as number,
            kind: checkedOffer.data.kind,
          });
        }
      }
      continue;
    }
    if ('updateDataModel' in message && !surfaces.has(message.updateDataModel.surfaceId)) return null;
  }
  return { messages: parsed.data, selectableBySource };
}
