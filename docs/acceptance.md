# PRD QA acceptance record

Scope: PRD V0.2 base flows (events, journeys, appointments) and the shell/profile/browser contract in `docs/contracts.md` and `docs/frontend-spec.md`. The current PRD V0.3 and `docs/expansion-spec.md` also add government appointments, services, and leisure. Their category-specific provider/UI integration is in progress; those cases cannot pass acceptance by reusing the base cards.

## Evidence rules

- A check is accepted only from its actual completed output. A test written or a source inspection is not a pass.
- The app's fixtures are fictional and controlled. Confirmed results prove only the local test provider flow, never a real site integration, real availability, or a real payment.
- Search constraints remain visible in result data; missing price/fees stay unknown. Selecting a card only prepares a review. Confirmation requires an explicit checkbox and button, then exactly one server-side approved mutation.
- An unclear outcome, stop, reset, changed profile, changed offer, expired review, or reconnect must never trigger a blind repeat. Verify the test provider state or report the outcome as unclear.

## Automated coverage

| File | Intended evidence | Latest status |
|---|---|---|
| `tests/integration/server-boundaries.test.ts` | Safe health readiness; direct fixture POST denied without session grant; approval rejects profile/amount/offer changes, expiration and second consume | Written; not yet run |
| `tests/e2e/acceptance.spec.ts` | Event, journey and appointment search through the real WebSocket/controller/browser fixture; unknown costs, source links, image dialog keyboard/focus, transmitted fields and consequences, explicit confirmation and no repeated approval | Written; not yet run |
| `tests/e2e/acceptance.spec.ts` | Government, service and leisure source facts/unknown charges, action disclosure, and request receipt without claiming a real appointment, engagement or enrollment | Written against V0.3 fixtures and action labels; integration not yet complete; not run |
| `tests/e2e/acceptance.spec.ts` | Current-session source links open the actual fixture page successfully; original event/leisure images load in the gallery | Written; not yet run |
| `tests/e2e/acceptance.spec.ts` | Direct POST to `/fixture/book` with the current visible session id and forged capability is denied | Written; not yet run |
| `tests/e2e/acceptance.spec.ts` | Changing a profile after preparing an event action removes confirmation and disables the stale card | Written; not yet run |
| `tests/integration/server-boundaries.test.ts` | Broker stops before posting; a simulated lost response produces `unclear`, submits once, and rejects a duplicate concurrent submit | Written; not yet run |
| `tests/e2e/acceptance.spec.ts` | Profile save/reload/edit/delete and blocked-storage/session-only messaging | Written; not yet run |
| `tests/e2e/acceptance.spec.ts` | Mobile Website/Chat toggle shows the same session screenshot; keyboard remains usable at 200% CSS zoom | Written; not yet run |

## Abnahme-status

- Source review confirms the Pages build selects fictional local fixtures, displays a demo disclosure, uses an in-memory transport, and disables voice. Root corrected the preview start and verified that the HTML, JavaScript, and CSS return HTTP 200 with the expected asset MIME types. That does not prove React rendered; no browser visual check has passed.
- `npm run typecheck` passed with exit 0 after the Pages transport `readyState` fix. `VITE_PAGES_DEMO=true npx vite build` passed, transforming 2,151 modules; that build preceded the final type-only `readyState:number` edit.
- The repaired-tree unit/integration suite passed 142/142 before Pages integration. Broker/service/controller tests passed 23/23 on their corrected sources before the Pages integration was complete. These are scoped/historical results, not a full post-Pages suite pass.
- Earlier profile and mobile Edge preview smokes passed against the pre-Pages app. The current Pages visual smoke did not produce a screenshot or a UI assertion; the local Edge attempt stalled. The Pages workflow includes `src/pages-demo/verify.mjs`, which starts its child preview with the explicit `/easy-web-assistant/` base and checks HTML, JavaScript, CSS, and SVG MIME types. It exercises the demo banner, approval checkbox, six simulated result kinds, Stop, Reset, and the absence of external/server requests. The script does not yet set a mobile viewport, and the CI smoke has not run.
- Government (6 tests) and service (9 tests) provider workers separately reported targeted unit suites passing against read-only fake/fixture readers. Those checks do not establish their controller/broker/UI integration and have not been rerun by QA.
- The typecheck and Pages Vite build have completed successfully. A full unit/integration rerun after the Pages source integration remains pending, and current Pages UI acceptance is pending the planned remote Chromium smoke.

## Open coverage limits

- The integration suite simulates an interrupted POST at the broker boundary; no browser E2E seam exists for forcing an unclear provider result. UI treatment of the unclear result remains a manual/e2e gap.
- Profile deletion confirmation is covered, as is blocked persistence. Corrupt/unsupported profile-envelope recovery and browser reload after a storage exception remain outside the current E2E file.
- Accessibility checks assert keyboard reachability, focus restoration for the gallery, responsive screenshot reuse and 200% CSS zoom layout access. They do not replace manual screen-reader testing or a full standards audit.
- Live voice/audio is unavailable in the controlled demo (`voiceAvailable: false`); only its separation from confirmation is in scope for this demo acceptance.
- The Pages demo has six synthetic categories and approval/result paths, but those Pages-specific flows still need the planned remote Chromium smoke. The existing E2E helper `finishProfile` in `tests/e2e/acceptance.spec.ts` covers profile setup; `search` and `selectAndCheckDisclosure` cover the previous WebSocket-backed app. `search` expects a `.browser-screenshot` and live fixture URL, so it cannot be reused unchanged for the static Pages fixture preview.
