# UI source review (ui)

Date: 2026-10-02. Reviewer: independent UI tester. Scope: `src/App.tsx`, `src/a2ui/**`, `src/components/**`, `src/profile/**`, `src/hooks/**`, `public/catalogs/**`, `shared/schema.ts` (read-only).

## Evidence limits

This is a source review, not a browser observation. No app server was used and no UI state is claimed as observed. The shared QA lock in `docs/qa-check-lock.md` is held by PRD10 QA; it says the E2E path is not ready and browser install/run has not started. I therefore ran no browser or global test/build/typecheck command. I made no production-code edits and added no test file. The UI source was changing during this review; findings below were rechecked against the latest source read.

## Findings

### [P1] New request approvals hide the selected offer and call the action a booking

**Trigger/reproduction:** Complete a profile, submit any government, service, or leisure request that returns an offer, select that offer, and open its approval. For example, follow the government case in `tests/e2e/acceptance.spec.ts` (`Find a test civic office appointment to ask about a residence certificate.`) and select “Review this appointment request”.

**Expected:** The approval includes the matching government/service/leisure card so the user can recheck the exact offer, and its final button uses the provider’s request/enrollment action label (for example, “Submit test service request”). This is a request receipt flow, not a booking confirmation.

**Actual from source:** `ApprovalReview` only chooses `EventCard`, `JourneyCard`, or `AppointmentCard`; every other kind falls through to `AppointmentCard`. The category card components return `null` if their kind does not match, so the offer details disappear from this review. The button text is hard-coded as “Confirm test booking” even though `approval.actionLabel` is available and the three new flows are request-only. The request action and consequences are shown elsewhere in the review, but the primary approval control still mislabels the action.

**Sources:** `src/App.tsx` lines 487–503 (especially 488, 492, 503); `src/components/offers/OfferCard.tsx` lines 120–145; contract `docs/contracts.md` PRD V0.3 extension (request receipt semantics). Existing UI acceptance cases expect request-specific button names at `tests/e2e/acceptance.spec.ts` lines 117–174.

**Acceptance impact:** Blocks the three new approval flows. The existing E2E cases that locate the request-specific button cannot find it; this was inferred from selectors/source and was not executed.

### [P2] Initial profile projection does not recognize the three new task kinds

**Trigger/reproduction:** With a populated profile, submit the government acceptance prompt “Find a test civic office appointment to ask about a residence certificate.” Then submit “Request a fictional home repair assessment.” or “Find a beginner pottery course at a community centre.” Inspect the `task` payload sent by the client (source-level repro; no live socket capture was performed).

**Expected:** Send the task with `neededProfileFor`’s minimal subset for its recognized kind: government and leisure need full name/email; service needs full name/email/phone. Category examples should guide users into these six supported flows.

**Actual from source:** The welcome examples contain only event/journey/appointment. `kindHint` recognizes only those three: the government prompt matches the generic `appointment` branch, so `submitTask` projects appointment fields (including phone/access needs) instead of the government subset. Service and leisure prompts match no branch, so `submitTask` sends `emptyProfile`. The later approval path does use the actual offer kind, but the initial task payload violates the task-profile minimization/projection contract and omits relevant fields for service/leisure.

**Sources:** `src/App.tsx` lines 26–30, 216–230, 516–521; `shared/schema.ts` lines 15–24; `docs/contracts.md` wire protocol and V0.3 extension; `docs/expansion-spec.md` proposed category-specific start examples.

**Acceptance impact:** The first task payload is over-broad for government and incomplete for service/leisure. No claim is made here that those extra fields leave the local controller or reach an external provider; controller-side re-projection and provider privacy were outside this UI-only finding.

## Scope checks recorded (source only)

- Latest `src/a2ui/validation.ts`, `src/a2ui/catalog.tsx`, and `public/catalogs/everyday-v1.json` include GovernmentCard, ServiceCard, and LeisureCard registrations/kind mappings. The validation gap visible in an earlier in-progress read was no longer present when rechecked, so it is not reported as a current finding.
- Offer cards show unknown charges, provenance/source links, completeness, original-image affordances, and disabled selection props in source. The gallery uses a dialog and restores focus to its trigger. These are source checks only; image loading, actual focus behavior, keyboard navigation, target dimensions at mobile widths, contrast, and screen-reader behavior remain unverified in a browser.
- Profile source includes edit/delete and a session-only route after a save failure. Reload persistence, failure behavior, and mobile access were not browser-tested.
- `docs/acceptance.md` and `docs/qa-check-lock.md` remain authoritative that full acceptance has not passed; this report does not change that status.
