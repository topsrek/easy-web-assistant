import type { Offer } from '../../shared/schema';
import './preview.css';

export function DemoFixturePreview({ offer }: { offer: Offer | null }) {
  return (
    <section className="pages-demo-preview" aria-label="Fictional listing preview">
      <div className="pages-demo-preview__bar">
        <span className="pages-demo-preview__dots" aria-hidden="true">● ● ●</span>
        <span>Static fixture preview</span>
      </div>
      {offer ? (
        <article className="pages-demo-preview__listing">
          {offer.images[0] && <img src={offer.images[0].url} alt={offer.images[0].alt} />}
          <p className="pages-demo-preview__provider">{offer.provider}</p>
          <h3>{offer.title}</h3>
          <p>{offer.subtitle}</p>
          <strong>{offer.priceLabel}</strong>
          <dl>{offer.facts.slice(0, 3).map((fact) => (
            <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>
          ))}</dl>
        </article>
      ) : (
        <div className="pages-demo-preview__empty">
          <p>Try one of the examples to preview its fictional listing here.</p>
        </div>
      )}
      <p className="pages-demo-preview__note">This is fixture content rendered by the app. It is not a screenshot, live website, or controlled browser session.</p>
    </section>
  );
}
