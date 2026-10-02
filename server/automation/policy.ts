import type { WebsitePolicy } from './types.js';

/** Reviewed public information routes only. Ticket checkout and account hosts are excluded. */
export const sfjazzPolicy: WebsitePolicy = {
  id: 'sfjazz-public-v1', provider: 'SFJAZZ',
  startUrl: 'https://www.sfjazz.org/calendar/', origin: 'https://www.sfjazz.org',
  documentPaths: [/^\/calendar\/$/, /^\/tickets\/productions\/[a-z0-9/_-]+\/$/i],
  assetPaths: [/^\/globalassets\//i, /^\/content\//i, /^\/scripts\//i, /^\/bundles\//i, /^\/static\//i],
};

export function permittedUrl(value: string, policy: WebsitePolicy, document = true): boolean {
  try {
    const url = new URL(value);
    if (url.origin !== policy.origin || url.protocol !== 'https:' || url.username || url.password) return false;
    // Public content routes do not need arbitrary queries, credentials or action parameters.
    if (url.search) return false;
    const paths = document ? policy.documentPaths : policy.assetPaths;
    return paths.some((pattern) => pattern.test(url.pathname));
  } catch { return false; }
}

export function requireDocument(value: string, policy: WebsitePolicy) {
  if (!permittedUrl(value, policy)) throw new Error('This website location is outside the reviewed public information routes.');
  const url = new URL(value); url.hash = ''; return url.href;
}
