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

## Acceptance status

- Source review confirms that the Pages build uses fictional local fixtures, displays a demo disclosure, uses an in-memory transport, and disables voice. The Website panel is a static fixture preview.
- The GitHub Actions run [37078417303](https://github.com/topsrek/easy-web-assistant/actions/runs/37078417303) passed typecheck, the Pages Vite build, and all six Chromium demo flows, including approval, Stop, Reset, and no external/server requests. It also checked the project subpath and asset MIME types. The deployment completed successfully at [https://topsrek.github.io/easy-web-assistant/](https://topsrek.github.io/easy-web-assistant/).
- The Pages checks cover the hosted browser demo only; they do not verify real provider integration, voice, booking, or payments. The Chromium run did not use a mobile viewport, and a manual Pages visual/accessibility review remains open.
- The repaired-tree unit/integration suite passed 142/142 before Pages integration. It has not been rerun against the final Pages source. A full `npm run build` remains unverified.
- Earlier targeted Broker, service, and controller suites passed 23/23 before Pages integration was complete; those results are scoped historical evidence.

## Open coverage limits

- The integration suite simulates an interrupted POST at the broker boundary; no browser E2E seam exists for forcing an unclear provider result. UI treatment of the unclear result remains a manual/e2e gap.
- The E2E spec includes profile deletion confirmation and blocked-persistence checks, but those cases are not yet run. Corrupt/unsupported profile-envelope recovery and browser reload after a storage exception remain outside the current E2E file.
- The authored accessibility checks cover keyboard reachability, gallery focus restoration, responsive screenshot reuse and 200% CSS zoom layout access; they remain unrun. Manual screen-reader testing and a full standards audit are also open.
- Live voice/audio is unavailable in the controlled demo (`voiceAvailable: false`); only its separation from confirmation is in scope for this demo acceptance.
- The Pages demo has six synthetic categories and approval/result paths; all six passed in the remote Chromium workflow. The smoke does not use a mobile viewport. The existing E2E helper `finishProfile` in `tests/e2e/acceptance.spec.ts` covers profile setup; `search` and `selectAndCheckDisclosure` cover the WebSocket-backed app and are not reused by the static Pages fixture preview.
