import type { Offer } from '../../shared/schema.js';

export interface WebsitePolicy {
  id: string;
  provider: string;
  startUrl: string;
  origin: string;
  documentPaths: RegExp[];
  assetPaths: RegExp[];
}
export interface WebsiteObservation {
  id: string;
  url: string;
  title: string;
  observedAt: string;
  text: string;
  links: Array<{ id: string; text: string; url: string }>;
  images: Array<{ url: string; alt: string }>;
  structuredData: unknown[];
}
export type WebsitePlan =
  | { action: 'follow_link'; linkId: string }
  | { action: 'extract'; candidateIds: string[] }
  | { action: 'no_match' };
export interface WebsitePlanner {
  plan(request: string, observation: WebsiteObservation, candidates: Offer[], visited: string[]): Promise<WebsitePlan>;
}
export interface WebsiteReader {
  observe(url: string): Promise<WebsiteObservation>;
  snapshot(): Promise<{ image: string; url: string; updatedAt: string; demo: false } | null>;
  close(): Promise<void>;
}
