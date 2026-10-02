import type { Offer, TaskKind } from '../../shared/schema.js';
import { extractWebsiteOffers } from './extract.js';
import { requireDocument } from './policy.js';
import { validateWebsitePlan } from './planner.js';
import type { WebsiteObservation, WebsitePlanner, WebsitePolicy, WebsiteReader } from './types.js';

export interface WebsiteSearchResult {
  offers: Offer[];
  observations: WebsiteObservation[];
  steps: Array<{ observationId: string; action: string; target?: string }>;
  stopReason: 'extracted' | 'no_match' | 'step_limit';
}

/** Bounded observe → plan → validate → navigate loop. No synthetic offers or silent demo fallback. */
export async function searchWebsite(reader: WebsiteReader, planner: WebsitePlanner, policy: WebsitePolicy,
  kind: TaskKind, request: string, cancelled: () => boolean = () => false): Promise<WebsiteSearchResult> {
  const result: WebsiteSearchResult = { offers: [], observations: [], steps: [], stopReason: 'step_limit' };
  const visited: string[] = [];
  let target = requireDocument(policy.startUrl, policy);
  const check = () => { if (cancelled()) throw new Error('Website reading was stopped.'); };
  for (let step = 0; step < 5; step++) {
    check();
    const observation = await reader.observe(target);
    check();
    requireDocument(observation.url, policy);
    visited.push(observation.url);
    result.observations.push(observation);
    const candidates = extractWebsiteOffers(observation, policy, kind);
    const plan = validateWebsitePlan(await planner.plan(request, observation, candidates, visited), observation, candidates, visited);
    check();
    if (plan.action === 'follow_link') {
      // IDs bind the action to this exact observation; arbitrary model URLs never reach the browser.
      target = requireDocument(observation.links.find((link) => link.id === plan.linkId)!.url, policy);
      result.steps.push({ observationId: observation.id, action: plan.action, target });
      continue;
    }
    result.steps.push({ observationId: observation.id, action: plan.action });
    result.stopReason = plan.action === 'extract' ? 'extracted' : 'no_match';
    if (plan.action === 'extract') result.offers = candidates.filter((offer) => plan.candidateIds.includes(offer.id));
    return result;
  }
  return result;
}
