import type { ReactElement } from 'react';
import { CommonSchemas, Catalog } from '@a2ui/web_core/v0_9';
import { createComponentImplementation } from '@a2ui/react/v0_9';
import { z } from 'zod/v3';
import { CATALOG_ID, offerSchema, type Offer } from '../../shared/schema';
import {
  AppointmentCard,
  EventCard,
  GovernmentCard,
  ImageGallery as OfferImageGallery,
  JourneyCard,
  LeisureCard,
  ServiceCard,
} from '../components/offers';

function isSafeHttpUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isSafeOffer(value: unknown): value is Offer {
  const parsed = offerSchema.safeParse(value);
  if (!parsed.success) return false;
  const offer = parsed.data;
  return isSafeHttpUrl(offer.sourceUrl)
    && offer.images.every((image) => isSafeHttpUrl(image.url) && (image.sourceUrl === undefined || isSafeHttpUrl(image.sourceUrl)))
    && offer.facts.every((fact) => fact.sourceUrl === undefined || isSafeHttpUrl(fact.sourceUrl))
    && offer.details.every((detail) => detail.sourceUrl === undefined || isSafeHttpUrl(detail.sourceUrl));
}

const safeOfferSchema = z.custom<Offer>(isSafeOffer, 'Offer must use valid http/https source URLs');
const safeImagesSchema = z.custom<Offer['images']>((value) => {
  const parsed = offerSchema.shape.images.safeParse(value);
  return parsed.success && parsed.data.every((image) => isSafeHttpUrl(image.url) && (image.sourceUrl === undefined || isSafeHttpUrl(image.sourceUrl)));
}, 'Images must use valid http/https source URLs');

const cardApi = (name: string) => ({
  name,
  schema: z.object({
    offer: safeOfferSchema,
    disabled: CommonSchemas.DynamicBoolean,
    onSelect: CommonSchemas.Action,
  }),
});

type CardProps = { offer: Offer; disabled?: boolean; onSelect?: () => void };
function cardImplementation(name: string, Card: (props: CardProps) => ReactElement | null) {
  return createComponentImplementation(cardApi(name), ({ props }) => (
    <Card offer={props.offer} disabled={props.disabled} onSelect={props.onSelect} />
  ));
}

export const EventCardComponent = cardImplementation('EventCard', EventCard);
export const JourneyCardComponent = cardImplementation('JourneyCard', JourneyCard);
export const AppointmentCardComponent = cardImplementation('AppointmentCard', AppointmentCard);
export const GovernmentCardComponent = cardImplementation('GovernmentCard', GovernmentCard);
export const ServiceCardComponent = cardImplementation('ServiceCard', ServiceCard);
export const LeisureCardComponent = cardImplementation('LeisureCard', LeisureCard);

export const EverydayOfferComponent = cardImplementation('EverydayOffer', ({ offer, disabled, onSelect }) => {
  if (offer.kind === 'event') return <EventCard offer={offer} disabled={disabled} onSelect={onSelect} />;
  if (offer.kind === 'journey') return <JourneyCard offer={offer} disabled={disabled} onSelect={onSelect} />;
  return <AppointmentCard offer={offer} disabled={disabled} onSelect={onSelect} />;
});

export const ImageGalleryComponent = createComponentImplementation({
  name: 'ImageGallery',
  schema: z.object({ images: safeImagesSchema, title: CommonSchemas.DynamicString }),
}, ({ props }) => <OfferImageGallery images={props.images} title={props.title} />);

const formTextApi = {
  name: 'FormTextField',
  schema: z.object({
    label: CommonSchemas.DynamicString,
    value: CommonSchemas.DynamicString,
    placeholder: CommonSchemas.DynamicString.optional(),
    disabled: CommonSchemas.DynamicBoolean.optional(),
  }),
};

export const FormTextFieldComponent = createComponentImplementation(formTextApi, ({ props }) => (
  <label className="a2ui-form-field">
    <span>{props.label}</span>
    <input value={props.value} placeholder={props.placeholder} disabled={props.disabled} onChange={(event) => props.setValue(event.target.value)} />
  </label>
));

const formChoiceApi = {
  name: 'FormChoicePicker',
  schema: z.object({
    label: CommonSchemas.DynamicString,
    options: z.array(z.object({ label: z.string().max(160), value: z.string().max(160) }).strict()).max(20),
    value: CommonSchemas.DynamicString,
    disabled: CommonSchemas.DynamicBoolean.optional(),
  }),
};

export const FormChoicePickerComponent = createComponentImplementation(formChoiceApi, ({ props }) => (
  <label className="a2ui-form-field">
    <span>{props.label}</span>
    <select value={props.value} disabled={props.disabled} onChange={(event) => props.setValue(event.target.value)}>
      <option value="">Choose an option</option>
      {props.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>
));

export const everydayCatalog = new Catalog(
  CATALOG_ID,
  'v0.9',
  [
    EventCardComponent,
    JourneyCardComponent,
    AppointmentCardComponent,
    GovernmentCardComponent,
    ServiceCardComponent,
    LeisureCardComponent,
    EverydayOfferComponent,
    ImageGalleryComponent,
    FormTextFieldComponent,
    FormChoicePickerComponent,
  ],
);
