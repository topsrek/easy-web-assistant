import { useEffect, useRef, useState } from 'react';
import { A2uiSurface } from '@a2ui/react/v0_9';
import { MessageProcessor } from '@a2ui/web_core/v0_9';
import type { Offer } from '../../shared/schema';
import { everydayCatalog } from './catalog';
import { validateA2UIMessages } from './validation';
import './a2ui.css';

export type A2UIOfferSurfaceProps = {
  messages: unknown[];
  version: number;
  currentVersion: number;
  disabled?: boolean;
  onSelect(offerId: string, version: number, kind: Offer['kind']): void;
};

type ActiveSurface = ReturnType<MessageProcessor['getSurfaces']> extends ReadonlyMap<string, infer T> ? T : never;

export function A2UIOfferSurface({ messages, version, currentVersion, disabled = false, onSelect }: A2UIOfferSurfaceProps) {
  const [surfaces, setSurfaces] = useState<ActiveSurface[]>([]);
  const [invalid, setInvalid] = useState(false);
  const liveProps = useRef({ version, currentVersion, disabled, onSelect });
  liveProps.current = { version, currentVersion, disabled, onSelect };

  useEffect(() => {
    const inactive = liveProps.current.disabled || liveProps.current.version !== liveProps.current.currentVersion;
    for (const surface of surfaces) surface.dataModel.set('/disabled', inactive);
  }, [surfaces, version, currentVersion, disabled]);

  useEffect(() => {
    const validated = validateA2UIMessages(messages);
    if (!validated) {
      setInvalid(true);
      setSurfaces([]);
      return;
    }

    const processor = new MessageProcessor([everydayCatalog], (action) => {
      const current = liveProps.current;
      if (current.disabled || current.version !== current.currentVersion || action.name !== 'select_offer') return;
      const key = `${action.surfaceId}\u0000${action.sourceComponentId}`;
      const source = validated.selectableBySource.get(key);
      if (!source || source.version !== current.currentVersion) return;
      if (action.context.offerId !== source.offerId || action.context.version !== source.version) return;
      current.onSelect(source.offerId, source.version, source.kind);
    });

    let active = true;
    const sync = () => {
      if (!active) return;
      const activeSurfaces = Array.from(processor.getSurfaces().values());
      const current = liveProps.current;
      const inactive = current.disabled || current.version !== current.currentVersion;
      for (const surface of activeSurfaces) surface.dataModel.set('/disabled', inactive);
      setSurfaces(activeSurfaces);
    };
    const created = processor.onSurfaceCreated(sync);
    const deleted = processor.onSurfaceDeleted(sync);

    try {
      processor.processMessages(validated.messages);
      sync();
      setInvalid(false);
    } catch {
      setInvalid(true);
      setSurfaces([]);
    }

    return () => {
      active = false;
      created.unsubscribe();
      deleted.unsubscribe();
      processor.dispose();
    };
  }, [messages]);

  if (invalid) return <p className="a2ui-message" role="status">This offer view is unavailable. Please request the information again.</p>;
  return <div className="a2ui-surfaces" aria-disabled={disabled || version !== currentVersion}>
    {surfaces.map((surface) => <A2uiSurface key={surface.id} surface={surface} />)}
  </div>;
}
