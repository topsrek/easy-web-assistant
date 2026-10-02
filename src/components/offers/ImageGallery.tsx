import * as Dialog from '@radix-ui/react-dialog';
import { useRef, useState } from 'react';
import type { Offer } from '../../../shared/schema';
import './offers.css';

export interface ImageGalleryProps {
  images: Offer['images'];
  title?: string;
}

export function ImageGallery({ images, title = 'Original images' }: ImageGalleryProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Set<number>>(() => new Set());
  const lastTrigger = useRef<HTMLButtonElement | null>(null);
  const count = images.length;

  if (!count) {
    return <p className="offer-gallery-empty">No original images were provided by the source.</p>;
  }

  return (
    <section className="offer-gallery" aria-label={`${title}, ${count} ${count === 1 ? 'image' : 'images'}`}>
      <h3 className="offer-section-heading">{title} <span className="offer-muted">({count})</span></h3>
      <ul className="offer-thumbnails">
        {images.map((image, index) => (
          <li key={`${image.url}-${index}`}>
            <button
              type="button"
              className="offer-thumbnail-button"
              aria-label={`Enlarge image ${index + 1} of ${count}: ${image.alt || 'Original offer image'}`}
              onClick={(event) => { lastTrigger.current = event.currentTarget; setSelected(index); }}
            >
              {failedImages.has(index) || !safeImage(image.url) ? (
                <span className="offer-image-failure" role="img" aria-label={`Image ${index + 1} unavailable`}>Image unavailable</span>
              ) : (
                <img src={image.url} alt={image.alt || `Original offer image ${index + 1}`} loading="lazy" onError={() => setFailedImages((current) => new Set(current).add(index))} />
              )}
            </button>
            {safeSource(image.sourceUrl) ? (
              <a className="offer-image-source" href={image.sourceUrl} target="_blank" rel="noreferrer">View image source</a>
            ) : <span className="offer-image-source">Image source unavailable</span>}
          </li>
        ))}
      </ul>

      <Dialog.Root open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="offer-dialog-overlay" />
          <Dialog.Content className="offer-dialog-content" onCloseAutoFocus={(event) => { event.preventDefault(); lastTrigger.current?.focus(); }}>
            <Dialog.Title className="offer-dialog-title">{title}</Dialog.Title>
            <Dialog.Description className="offer-dialog-description">Browse all {count} original images. Closing returns focus to the thumbnail you opened.</Dialog.Description>
            {selected !== null && images[selected] && (
              <figure className="offer-enlarged-figure">
                {failedImages.has(selected) || !safeImage(images[selected].url) ? (
                  <p className="offer-image-failure" role="status">This original image could not be loaded.</p>
                ) : (
                  <img src={images[selected].url} alt={images[selected].alt || `Original offer image ${selected + 1}`} onError={() => setFailedImages((current) => new Set(current).add(selected))} />
                )}
                <figcaption>
                  Image {selected + 1} of {count}
                  {' · '}
                  {safeSource(images[selected].sourceUrl) ? <a href={images[selected].sourceUrl} target="_blank" rel="noreferrer">Open original source</a> : 'Original source unavailable'}
                </figcaption>
              </figure>
            )}
            <div className="offer-dialog-actions">
              <button type="button" className="offer-button" disabled={selected === null || selected <= 0} onClick={() => setSelected((index) => index === null ? null : Math.max(0, index - 1))}>
                Previous image
              </button>
              <button type="button" className="offer-button" disabled={selected === null || selected >= count - 1} onClick={() => setSelected((index) => index === null ? null : Math.min(count - 1, index + 1))}>
                Next image
              </button>
              <Dialog.Close asChild><button type="button" className="offer-button">Close image</button></Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}

function safeSource(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function safeImage(value: string): boolean {
  return safeSource(value);
}
