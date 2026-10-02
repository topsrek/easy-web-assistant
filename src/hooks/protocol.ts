import { serverEventSchema, type ServerEvent } from '../../shared/schema';

export function parseServerEvent(value: unknown): ServerEvent | null {
  const parsed = serverEventSchema.safeParse(value);
  return parsed.success ? parsed.data as ServerEvent : null;
}

export function decodeMessage(data: unknown): unknown {
  if (typeof data !== 'string' || data.length > 2_000_000) throw new Error('The server sent an invalid message.');
  return JSON.parse(data) as unknown;
}
