# Approval and broker review

Date: 2026-10-02  
Scope: `server/approval.ts`, `server/broker.ts`, `server/browser.ts`, `server/index.ts`, `server/session.ts`, `shared/schema.ts`, and existing approval/broker/integration tests. Requirements read: `easy-web-assistant-prd.md` (V0.3), `docs/contracts.md`, `docs/acceptance.md`, and `docs/qa-check-lock.md`.

## Finding

### [P2] Approval can be prepared from an offer after disclosed source data disappears

**Trigger:** A user selects an offer whose review includes an unknown fee, a source fact, or a condition. Before approval preparation re-reads the fixture listing, that listing no longer contains the item. The removed item is still present in the selected offer held by the controller.

**Expected:** Preparation rejects the stale offer and asks the user to search again. The approval must describe the same current facts and conditions the provider listing verifies.

**Actual:** `ToolBroker.prepare` creates a fresh approval binding from the old selected offer. For unknown costs, it compares the current list against only a prefix of the old list sized to the current list; an empty current list therefore compares equal to an empty prefix. Facts and details use `live.every(item => offer.some(...))`, which verifies that current entries existed in the old offer but never verifies that old entries remain current. This lets stale conditions accompany a valid one-use capability.

**Reproduction:** Added `tests/review/approval-review.test.ts`. Run only this mock test with `npx vitest run tests/review/approval-review.test.ts`. All three cases fail because `prepare` resolves instead of rejecting:

- current offer has `unknownCosts: []` while the selected offer disclosed `['Service fee unknown']`;
- current offer has no facts while the selected offer disclosed a date;
- current offer has no details while the selected offer disclosed a cancellation condition.

The test uses a fake `readOffers` result and does not start a browser or make network requests. The broker then binds the stale offer ID, price, and old unknown-cost list; the fixture POST validates the selected offer/action and capability, not the current facts/details. A user can therefore explicitly approve based on details no longer present in the current fixture source.

**Affected source:** `server/broker.ts`, in the current-offer comparison inside `prepare` (unknown-cost prefix comparison and one-direction `facts`/`details` membership checks). The minimal regression cases are in `tests/review/approval-review.test.ts`.

## Reviewed paths without a confirmed finding

- `ApprovalGate` binds and compares action, site, offer ID, transmitted inputs, amount/currency/unknown costs, and version; it clears a consumed token and applies the five-minute expiry.
- The session checks version and projected profile at confirmation. The broker consumes approval before opening a grant; fixture submission authorization checks its exact session, offer, action, inputs, one-use state, capability, and stop state.
- A submission is issued once. Unclear submission recovery uses a read-only, session/offer/action/capability-bound lookup; no retry path was found. Result outcomes distinguish bookings from request receipts for the three new kinds.
- Source review found direct fixture POSTs without a live broker grant rejected, but the full HTTP/session integration cases were not run in this review.

## Limits

The one-file mock regression run completed with 3 expected failures, demonstrating the finding. I did not run the global unit, integration, typecheck, or build checks because `docs/qa-check-lock.md` assigns those checks to QA. I did not run browser checks: the QA lock says the browser install is absent and the vertical flow is still being integrated. No real provider, account, payment, or personal data was used; `.env` was not read.

## Nachprüfung des Fixes (2026-10-02)

Der aktuelle Stand von `server/broker.ts` vergleicht das vollständige erneut gelesene Angebot symmetrisch mit dem ausgewählten Angebot (`canonical(live) !== canonical(offer)`). Die drei Tests in `tests/review/approval-review.test.ts` blieben unverändert. Der gezielte Lauf `npx vitest run tests/review/approval-review.test.ts` endete erfolgreich: **1 Testdatei, 3 Tests bestanden**. Damit sind die drei zuvor reproduzierten Fälle für entfernte Gebühren, Fakten und Bedingungen durch den aktuellen Vergleich abgedeckt.

Diese Nachprüfung war auf Quellstand und den einen Mock-Test beschränkt. Globale Tests, Integration, Typprüfung, Build und Browserlauf wurden nicht ausgeführt; dafür gilt weiterhin der QA-Lock.
