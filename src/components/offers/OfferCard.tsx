import type { Offer } from '../../../shared/schema';
import { ImageGallery } from './ImageGallery';
import './offers.css';

export interface OfferCardProps {
  offer: Offer;
  disabled?: boolean;
  onSelect?: () => void;
}

const kindLabels: Record<string, { type: string; facts: string }> = {
  event: { type: 'Event ticket', facts: 'Event information' },
  journey: { type: 'Journey', facts: 'Journey information' },
  appointment: { type: 'Appointment', facts: 'Appointment information' },
  government: { type: 'Government information', facts: 'Authority and appointment information' },
  service: { type: 'Service offer', facts: 'Service information' },
  leisure: { type: 'Leisure activity', facts: 'Activity information' },
};

function displayTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function displayPrice(offer: Offer): string {
  if (offer.price === null) return 'Unknown';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: offer.currency }).format(offer.price);
  } catch {
    return `${offer.currency} ${offer.price}`;
  }
}

export function OfferCard({ offer, disabled = false, onSelect }: OfferCardProps) {
  const labels = kindLabels[String(offer.kind)] ?? { type: 'Offer', facts: 'Offer information' };
  const offerCompleteness = offer.completeness;
  return (
    <article className={`offer-card offer-card--${offer.kind}`} aria-labelledby={`offer-title-${offer.id}`}>
      <header className="offer-card-header">
        <div>
          <p className="offer-eyebrow">{labels.type}</p>
          <h2 id={`offer-title-${offer.id}`} className="offer-title">{offer.title}</h2>
          {offer.subtitle && <p className="offer-subtitle">{offer.subtitle}</p>}
        </div>
        <div className="offer-card-badges">
          {offer.demo && <span className="offer-demo-badge">Test environment</span>}
          {offerCompleteness && offerCompleteness !== 'complete' && <span className="offer-completeness-badge">{completenessLabel(offerCompleteness)}</span>}
        </div>
      </header>

      <dl className="offer-meta">
        <div><dt>Provider</dt><dd>{offer.provider || 'Unknown'}</dd></div>
        <div><dt>Price</dt><dd>{displayPrice(offer)}{offer.priceLabel ? ` · ${offer.priceLabel}` : ''}</dd></div>
      </dl>
      {offer.unknownCosts.length > 0 && (
        <section className="offer-cost-notice" aria-label="Costs not yet known">
          <h3 className="offer-section-heading">Costs not yet known</h3>
          <ul>{offer.unknownCosts.map((cost, index) => <li key={`${cost}-${index}`}>{cost}</li>)}</ul>
        </section>
      )}

      {offer.facts.length > 0 && (
        <section className="offer-facts" aria-label={labels.facts}>
          <h3 className="offer-section-heading">{labels.facts}</h3>
          <dl className="offer-fact-list">
            {offer.facts.map((fact, index) => (
              <div className="offer-fact" key={`${fact.label}-${index}`}>
                <dt>{fact.label || 'Information'}</dt>
                <dd>{fact.value || 'Unknown'}{fact.completeness && fact.completeness !== 'complete' && <span className="offer-completeness"> {completenessLabel(fact.completeness)}</span>}</dd>
                {fact.sourceUrl && <SourceLink href={fact.sourceUrl} label={`Source for ${fact.label || 'information'}`} />}
              </div>
            ))}
          </dl>
        </section>
      )}

      <ImageGallery images={offer.images} title="Original images" />

      {offer.details.length > 0 && (
        <section className="offer-details" aria-label="More details and conditions">
          <h3 className="offer-section-heading">Details and conditions</h3>
          {offer.details.map((detail, index) => (
            <details className="offer-disclosure" key={`${detail.title}-${index}`} open>
              <summary>{detail.title || 'Additional detail'}{detail.completeness && detail.completeness !== 'complete' && <span className="offer-completeness"> — {completenessLabel(detail.completeness)}</span>}</summary>
              <p>{detail.text || 'No detail supplied.'}</p>
              {detail.sourceUrl && <SourceLink href={detail.sourceUrl} label={`Source for ${detail.title || 'detail'}`} />}
            </details>
          ))}
        </section>
      )}

      <footer className="offer-card-footer">
        <div className="offer-source-info">
          <SourceLink href={offer.sourceUrl} label="View original offer" />
          <span>Observed {displayTimestamp(offer.observedAt)}</span>
        </div>
        {onSelect && (
          <button className="offer-button offer-select-button" type="button" disabled={disabled} onClick={onSelect}>
            {offer.selectLabel || 'Select this option'}
          </button>
        )}
      </footer>
    </article>
  );
}

function completenessLabel(completeness: 'complete' | 'partial' | 'unknown'): string {
  return completeness === 'partial' ? 'Partially verified' : 'Completeness unknown';
}

function SourceLink({ href, label }: { href: string; label: string }) {
  try {
    const url = new URL(href);
    if (url.protocol === 'http:' || url.protocol === 'https:') return <a href={href} target="_blank" rel="noreferrer">{label}</a>;
  } catch { /* Invalid or unsafe source URLs are shown as unavailable. */ }
  return <span className="offer-source-unavailable">{label} unavailable</span>;
}

export function EventCard(props: OfferCardProps) {
  return <KindCard kind="event" {...props} />;
}

export function JourneyCard(props: OfferCardProps) {
  return <KindCard kind="journey" {...props} />;
}

export function AppointmentCard(props: OfferCardProps) {
  return <KindCard kind="appointment" {...props} />;
}

export function GovernmentCard(props: OfferCardProps) {
  return <KindCard kind="government" {...props} />;
}

export function ServiceCard(props: OfferCardProps) {
  return <KindCard kind="service" {...props} />;
}

export function LeisureCard(props: OfferCardProps) {
  return <KindCard kind="leisure" {...props} />;
}

function KindCard({ kind, ...props }: OfferCardProps & { kind: string }) {
  if (String(props.offer.kind) !== kind) return null;
  return <OfferCard {...props} />;
}
