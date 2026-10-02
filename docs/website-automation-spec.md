# Existing website reading and browser planning

Audit priority: critical finding 4, the missing website observation and browser planning path. New code is isolated under `server/automation/`; it does not recycle local fixture JSON.

## Implemented scope

- `PublicWebsiteBrowser` starts an ephemeral Playwright browser with no inherited login/profile. It reads rendered, visible DOM text, observed links, original same-origin images and provider JSON-LD from the actual website. A fixed application function performs the observation; no model-supplied JavaScript runs.
- `GemmaWebsitePlanner` reuses an injected existing AI client. It selects an observed link ID, observed candidate IDs, or no match. Runtime validation rejects extra fields, arbitrary selectors/URLs, invented IDs and visited links. Website instructions are untrusted data.
- `searchWebsite` performs at most five observe/plan/validate steps and checks cancellation before and after each await. It never substitutes demo offers after live errors or absent matches.
- `extractWebsiteOffers` copies provider data into source-linked partial cards. Prices are listed components, never confirmed totals. Missing cost, availability, dates and conditions stay unknown. A page without structured event data is explicitly a partial source reading, with original page text accessible in details. Unrelated images are excluded.
- The first policy covers the SFJAZZ public calendar and production detail pages. It excludes ticket checkout, accounts, off-origin navigation, POSTs, arbitrary query parameters, downloads, websocket traffic and human-verification bypasses. Only reviewed same-origin resource paths can load. This conservative policy may leave dynamic parts unreadable; a partial reading is not complete search coverage.

Official public source routes checked on 2026-10-02: [calendar](https://www.sfjazz.org/calendar/) and [production details](https://www.sfjazz.org/tickets/productions/26-27/lila-downs/). Request interception blocks service workers as specified in [Playwright BrowserContext documentation](https://playwright.dev/docs/api/class-browsercontext#browser-context-route).

## Integration supplied for owner review

`server/automation/controller-integration.patch` proposes these existing-file changes:

1. `AssistantAI.websitePlanner()` reuses its current private model client; it does not alter authentication, provider or model configuration.
2. `AssistantSession` branches live event requests before fixture generation. Other live categories report that no existing website adapter is configured; the explicit demo path remains available when `DEMO_MODE=true`.
3. Source cards are displayed using the existing A2UI contract with disabled selection actions and working original source links. A server guard also prevents approval issuance for real read-only offers.
4. Website snapshots are marked `demo:false`. Stop/reset/disconnect close the reader and invalidate pending search results.

The patch has not been applied merely by saving it. The current code, QA record and owner readback determine integration status.

## Verification

Offline tests: `tests/automation/website.test.ts`. Coverage includes provenance and unknown values, source image association, malformed source data, policy boundaries, invented model actions/IDs, demo/no-credential gating, bounded navigation and late-plan cancellation. Mocked model tests do not prove Google account access.

Actual public DOM smoke: in the exclusive QA window run `node_modules/.bin/tsx server/automation/public-smoke.ts` with the existing installed Playwright browser or process-local `PLAYWRIGHT_BROWSER_CHANNEL=msedge`. It visits the calendar and an observed detail link, then records `.cache/automation/public-smoke.json` and a JPEG. Its planner is deliberately scripted and no model API is called. Report actual exit status and source observations; do not call this a model or booking pass.

## Remaining acceptance boundaries

The live Google route/credit scope is owned by the Cloud/AI chats and remains unresolved at implementation time. Live Gemma planning therefore requires a separate real run after model configuration is verified. No API call or credential change is authorized by this module alone.

Reading public pages does not implement real ticket selection, reservation, checkout or verified submissions. Those require a separately reviewed provider action adapter and the existing approval/broker protocol. No existing website booking is claimed. The other five categories still require their own reviewed website policies and adapters.
