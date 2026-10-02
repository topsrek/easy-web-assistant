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

- Source review confirms the UI presents a clearly labelled fictional test provider, missing event fees and appointment costs, a source link, approval disclosures, a single explicit confirmation button, and a same-session browser screenshot panel.
- The test configuration sets `PLAYWRIGHT_BROWSERS_PATH` to the workspace-local `.playwright-browsers` directory. No browser install or test run has been verified in this QA turn yet.
- No post-expansion unit, typecheck, build, integration, or E2E result is claimed here. A previous frontend status reported 36/36 unit tests before the current provider updates; it is historical evidence only.
- Government (6 tests) and service (9 tests) provider workers separately reported targeted unit suites passing against read-only fake/fixture readers. Those checks do not establish their controller/broker/UI integration and have not been rerun by QA.
- Full typecheck/build and the authored test suites remain pending a healthy shell/browser runtime and a free QA check lock.

## Open coverage limits

- The integration suite simulates an interrupted POST at the broker boundary; no browser E2E seam exists for forcing an unclear provider result. UI treatment of the unclear result remains a manual/e2e gap.
- Profile deletion confirmation is covered, as is blocked persistence. Corrupt/unsupported profile-envelope recovery and browser reload after a storage exception remain outside the current E2E file.
- Accessibility checks assert keyboard reachability, focus restoration for the gallery, responsive screenshot reuse and 200% CSS zoom layout access. They do not replace manual screen-reader testing or a full standards audit.
- Live voice/audio is unavailable in the controlled demo (`voiceAvailable: false`); only its separation from confirmation is in scope for this demo acceptance.
- PRD V0.3 government, services, and leisure have draft browser cases in the E2E file for their source facts, unknown charges, exact action labels and request-only outcomes. Passing remains blocked on complete controller, fixture, A2UI, profile projection and result integrations, then execution of those cases.
