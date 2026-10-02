import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PublicWebsiteBrowser } from './browser.js';
import { sfjazzPolicy } from './policy.js';
import { searchWebsite } from './search.js';
import type { WebsitePlanner } from './types.js';

/** Run only in the coordinated QA window. This proves live DOM reading, not live model access. */
const reader = new PublicWebsiteBrowser(sfjazzPolicy);
const planner: WebsitePlanner = {
  async plan(_request, observation, candidates) {
    if (candidates.length) return { action: 'extract', candidateIds: [candidates[0].id] };
    const link = observation.links.find((item) => item.url.includes('/tickets/productions/'));
    return link ? { action: 'follow_link', linkId: link.id } : { action: 'no_match' };
  },
};
try {
  const result = await searchWebsite(reader, planner, sfjazzPolicy, 'event', 'Read one public event detail');
  if (!result.offers.length || result.observations.length < 2) throw new Error('The public calendar-to-detail reading did not produce a sourced offer.');
  const directory = resolve('.cache/automation');
  await mkdir(directory, { recursive: true });
  const snapshot = await reader.snapshot();
  if (snapshot) await writeFile(resolve(directory, 'public-smoke.jpeg'), Buffer.from(snapshot.image.split(',')[1], 'base64'));
  const evidence = { checkedAt: new Date().toISOString(), planner: 'scripted; no model API call', policy: sfjazzPolicy.id,
    stopReason: result.stopReason, steps: result.steps,
    observations: result.observations.map(({ id, url, title, observedAt, text, links, images, structuredData }) => ({ id, url, title, observedAt, visibleTextLength: text.length, allowedLinks: links.length, providerImages: images.length, structuredBlocks: structuredData.length })),
    offers: result.offers };
  await writeFile(resolve(directory, 'public-smoke.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ stopReason: result.stopReason, title: result.offers[0].title, sourceUrl: result.offers[0].sourceUrl,
    demo: result.offers[0].demo, images: result.offers[0].images.length, observations: result.observations.length,
    evidence: resolve(directory, 'public-smoke.json'), modelCalled: false }));
} finally { await reader.close(); }
