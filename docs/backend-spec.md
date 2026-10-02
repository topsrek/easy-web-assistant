# Backend implementation assignments

Read easy-web-assistant-prd.md V0.3 and docs/contracts.md. Contracts authoritative. Eight visible Luna/high implementation chats: controller/shared/package/demo; events; journeys; appointments; browser/approval/broker; AI/voice; QA/acceptance; documentation/local delivery. No internal subagents, no worktrees, no edits outside assigned files. Other chats can change files during work; check current contracts before final validation. Each worker returns exports, checks, limitations. Managers resolve cross-file changes through contracts and review. Cloud owns config/env and frontend owns src/catalogs/profile tests.

Management acceptance must separate controlled test provider demonstration from real integration, and modeled/live audio readiness from verified API operation. Completion requires passing checks and honest documentation. Pending dependency is not permission to fake exports, results, or successful tests.

## Visible chats and resumed status

User authorized resuming and correction messages to project chats via coordinator on October 2. No internal agents/worktrees.

| Assignment | Thread ID | Status |
| --- | --- | --- |
| Controller/shared/package/demo | internal owner chat | Six-kind integration, actual Zod install and Astra routing/late-result/source fixes in source; integrated regressions pending QA |
| Events | internal owner chat | 13/13 targeted tests passed |
| Journeys | internal owner chat | 10/10 targeted tests passed |
| Appointments | internal owner chat | 34/34 targeted tests passed after source-test correction |
| Browser/broker/approval | internal owner chat | 25 targeted tests including independent approval regressions passed; opt-in Edge channel added |
| AI/voice | internal owner chat | Temporary region change reverted; matching configuration mock rerun passed 14/14, no actual API calls |
| QA/acceptance | internal owner chat | Current suite passed 15 files/142 tests; standalone Vite bundle passed; typecheck/full package build/E2E pending |
| Local documentation | internal owner chat | Local delivery docs and safe Git initialization complete; acceptance updates in progress |

Earlier attempts for the last four chats failed model metadata validation or app reconnect/project lookup; fresh creation with explicit Luna/high succeeded. The app sidebar inventory may omit known chats; read/wait by exact ID is required before assuming a chat missing.

QA alone owns comprehensive typecheck/build checks under docs/qa-check-lock.md after Windows ENOMEM/allocation failures. All other chats use scoped checks only. Existing whole-project check failures remain unresolved until QA records successful evidence. Controller instructed to emit unique surface IDs/cards per offer, reject stale async output after stop/reset and distinguish model connectivity from demo provider mode.

## Current review and host limitations

PRD V0.3 canonical extension is published in docs/contracts.md: government/service/leisure, separate providers and A2UI cards, source-specific minimal fields, exact request actions and verified request_received outcomes. Expansion manager owns its additional three chats, IDs in docs/expansion-spec.md.

Controller actual sources now use unique surface IDs per offer, read offers through the real isolated browser and guard async search output by task version. Provider review corrections assigned: source-origin/provenance preservation, known event facts rather than duplicate unknowns, direct journey does not imply zero stops, explicit hard-constraint rejection for appointments and journeys.

Repeated process helper setup-refresh/CreateProcess failures now affect the manager and multiple worker checks. Earlier passing provider tests precede these review edits; new edits are not yet verified. Root and QA notified. Git initialization reported by documentation worker without commit/push, subsequent ignore/status readback failed to start. No successful whole-project typecheck/build/E2E evidence yet. Avoid uncontrolled retry or compiler floods; preserve source and let QA verify after host recovery.

AI/Voice worker completed source and SDK mock tests; execution failed before Vitest process startup. No real model API request was made. Gemini handles task classification/conversation; Gemma selects IDs of validated observed facts instead of inventing displayed facts. Live input/output audio and transcript/tool/interruption handling implemented, booking toolcalls denied. Controller still needs configured voice readiness rather than hardcoded false and six-kind schema integration. Automatic review rejected the worker's attempt to send a project status message as insufficiently authorized; manager relayed the dependency without asking the user again because coordinator provided explicit human resume authorization.

## Verified recovery evidence

Coordinator found per-command require_escalated permits bounded project commands despite default process helper failure; no permanent sandbox disable. Reviewed provider reruns: events 13/13, journeys 10/10, appointments 34/34 passed. Documentation readback completed, Git initialized without commit/push, env/credentials/browser cache ignored. These targeted results do not replace integrated QA.

Actual subsequent source read found schema now has six kinds and result.outcome, configured voice readiness present. Pending critical controller integration at time of review: fixture POST must supply broker action and return/store action/outcome/session; all six offers eligible; /fixture/state scoped read-only recovery endpoint; voice completion must not directly run task with empty profile; interruption and stable transcript IDs. Broker action mapping corrected per canonical contract and state recovery added. QA notified to verify current code before vertical runs. Root owns global recovery coordination, QA owns serial whole-project checks.

Latest verified source reads supersede those pending items: six-provider registry and POST action/result shape integrated; receipt lookup now compares a hash of the current opaque operation token; source URLs include session; shared schema supports voice interruption and transcript IDs; controller no longer directly creates empty-profile voice tasks. Zod pinned to 3.25.76, matching A2UI. AI/voice mock rerun completed 14/14. QA began serial Unit/integration checks; comprehensive typecheck/build/E2E still require completed evidence. QA instructed to force deterministic demo environment and avoid reusing a potentially live server, so tests make no unapproved model calls. Controller fixing microphone session reuse and safe readable error propagation.

Independent review evidence is in docs/reviews/approval-review.md and voice-review.md (owned by reviewers). Approval P2 reproduced removed fees/facts/conditions still accepted by asymmetric comparison. Broker source now uses full canonical equality of current and selected normalized Offer; independent regressions require rerun. Voice V-1 reproduced dropped final user transcript; App source now has ID-based task dispatch with local profile projection, focused integration mock still pending. Manager did not overwrite reviewer tests or reports.

First QA suite completed 12 files, 131 passed / 1 failed (Appointment mixed-origin expected error wording). Appointment worker corrected the test to distinguish inconsistent field sources from internally consistent offers of different origins, retained provider protection, and reran 34/34 successfully. Full TypeScript check was stopped after over 100 seconds without output; no pass. Package build repeats its initial tsc step, so a bounded stop and separate Vite diagnostic may be needed. Neither a separate bundle diagnostic nor targeted tests substitute for full typecheck/build/E2E acceptance.

Broker worker completed 25 targeted tests across three files, including the three independent approval regression cases; canonical equality fix verified. Voice worker completed 14 mocked tests and emitted stable transcript IDs/interruption. Controller source finished six-provider registry, sources, protected action results and microphone reuse. QA still owns final integrated acceptance.

Critical dependency readback: manager ran npm ls zod --depth=4 and got ELSPROBLEMS. Despite manifest/lock pin 3.25.76, installed root node_modules/zod was still 4.6.5 invalid; A2UI had nested 3.25.76. Earlier compiler runs therefore did not test an actually aligned installed dependency tree. Controller/package owner instructed to perform actual scoped install/dedupe under QA coordination, then verify npm ls before any new compiler attempt. No conclusion yet that Zod alignment fixes the native TypeScript hang.

## Current integration evidence (supersedes earlier pending snapshots)

Actual root installation now matches Zod 3.25.76; controller's `npm ls zod --all` exited 0 with A2UI and zod-to-json-schema deduplicated to that version. Installation used the project cache with lifecycle scripts disabled. Whole-project compiler success remains unverified.

System Edge is present. BrowserSession supports explicit `PLAYWRIGHT_BROWSER_CHANNEL=msedge`, rejects other configured values, and retains bundled Chromium as the default. QA's `PLAYWRIGHT_CHANNEL=msedge` chooses the test runner and propagates the BrowserSession switch to its demo server. Sessions use fresh isolated contexts. The Chromium download failed; the first Edge profile smoke launched but timed out loading Vite module endpoints. QA is diagnosing the module requests before retrying.

Astra independently found A-01/P1: GET `/fixture/:kind` precedes and shadows `/fixture/state`, causing exact-operation receipt verification to return 404 and positive completions to become unclear. Controller owns the route correction; QA owns an actual Express receipt regression. This finding remains open until current source and test evidence confirm the fix.

The user explicitly rejected Vertex. Cloud manager is clarifying and verifying the normal Gemini API/Google Cloud billing route; exact live setup remains pending that clarification. Configuration is back to Gemini with demo mode enabled and local key lines inactive. The temporary Live-region AppConfig property and related changes were withdrawn; Voice owner is reverting the matching code and test to the existing configuration contract. No real model/audio success is claimed; local deterministic demo acceptance continues independently.

Voice rollback is now complete and its final targeted run passed 14/14 mocked tests. Later Astra findings A-02 (late receipt corrupts a newer task), A-03 (case-mismatched journey departure lookup), and A-04 (source details hidden only in JSON) are assigned to controller/demo and journey owners. A-05 uses a canonical selection-time minimal-profile update and immutable result identity, documented in contracts and coordinated with the frontend manager. A-07 test-helper and exact six-flow receipt coverage changes belong to QA. Reviewer-owned regression sources remain unchanged; their latest execution is still pending the owner fixes/QA window. An additional static Stop finding is assigned to the controller: clearing or version-binding the offer selection context must prevent reselecting old offers using the new stopped version.

Newest source readback confirms controller has the immutable operation version/kind/binding, guarded late success/error/cleanup updates, optional original result identity, selection-time actual-kind profile projection, and cleared offer/kind/profile selection context on Stop. Fixture HTML renders escaped description, source details and unknown costs visibly; its direct action control is explicitly inactive. Journey time-key correction passed 10/10 targeted tests including a positive 9:15 AM match. These source changes still need the unchanged independent Astra regressions and integrated QA. Controller owns new `tests/controller.test.ts` for minimal-profile delivery and stopped-offer selection regressions; reviewers retain ownership of `tests/review/**`.

QA's extended Edge attempt loaded the app and exercised profile saving/editing. Remaining failures observed there were outdated test Close expectations after successful automatic dialog closure. QA is correcting those helpers and rerunning; completed profile/mobile/fachflow acceptance and whole-project compiler/build success are still unverified.

QA then executed the unchanged independent `tests/review/astra-overall.test.ts`: 3/3 passed, covering positive journey time matching, visibly rendered original source conditions, and a late request receipt after Stop/new task without completing the new task. Frontend manager confirmed selection uses actual card kind and result-version guards preserve historical receipts without active-state changes. The two additional controller regressions remain pending QA execution; positive real HTTP receipt and completed six-flow browser acceptance still require evidence.

Latest completed QA suite supersedes earlier counts: `npm test -- --maxWorkers=1` exited 0, 15 files/142 tests passed in 7.27 seconds, including the additional controller regressions. Real HTTP integration currently proves the fixed state route's protected negative JSON response, not a positive authorized receipt; the positive six-flow browser runs remain required. `vite build` run separately without TypeScript exited 0 (2,147 modules, 604.54 kB JS/172.80 kB gzip). This is a bundler pass, not a full `npm run build` or typecheck pass. QA is preparing Preview plus deterministic demo backend and Edge visual/functional acceptance because the dev-server module startup is unstable. A read-only check found no leftover native TypeScript process; that suspected cause is unconfirmed.

QA then found port 5173 owned by a Vite process from the separate `a separate local project` project. That process must not be stopped or reused for this project's acceptance. QA is assigned free explicit test ports with a test-only launcher using the existing `createAppServer({port, origin, settings})` API and a matching Preview proxy/baseURL. The UI uses `location.host` for WebSocket, so no product frontend change is needed for this isolation. This observation does not prove the cause of all earlier module timeouts.

Root reserved only new `server/automation/**`, `tests/automation/**`, and `docs/website-automation-spec.md` for the newly user-requested automation audit/design chat. Existing browser/broker/AI/session/providers/shared/package ownership remains unchanged. Integrating that design requires concrete coordinated owner patches; no real website mutation, cloud setup change, or model success is implied by the reservation. Any reported TypeScript diagnostics require the actual error artifact and a serialized QA check rather than inference from prior hangs.

## Resumed type corrections after publication snapshot

Coordinator resumed scoped Backend fixes after the initial public-main commit `c01d36ddd1d2628427ad0966b40c2cada97053d2`. Release remains the only Git owner; QA is now the only test/compiler/build runner. Existing controller package/shared files must not be changed for Pages yet, and new website-automation controller integration remains on hold until the Pages publication checkpoint. These limits do not block the narrowly assigned corrections below.

The post-Zod QA typecheck completed with exit 1 in 7.285 seconds; it did not hang. Its output has 26 diagnostic lines, allocated as follows:

| File | Diagnostics | Existing owner / scoped correction |
| --- | --- | --- |
| server/index.ts | 5 | Controller: capture/narrow one address value; explicitly validate the session string; handle RawData byte lengths without weakening protocol limits |
| server/providers/events.ts | 1 | Events: explicitly narrow optional string in known-value predicate |
| tests/broker.test.ts | 14 | Broker: current five-argument authorization type and accurately typed receipt/recovery mocks; preserve every behavioral assertion |
| tests/services.test.ts | 5 | Existing Service worker: schema-compliant completeness in test details, with uncertainty preserved |
| src/a2ui/A2UIOfferSurface.tsx | 1 | Frontend manager/owner: React-specific surface/component typing |

All four Backend file owners have received the scoped resume and exact diagnostics; the Expansion manager is informed about its Service worker. No typecheck success is claimed until QA reruns the integrated corrected source. The additional onboarding Controller suite passed 4/4 in QA. Preview profile and mobile smokes each passed 1/1; the Event E2E attempt was interrupted without completing, so the six full category flows still require evidence.

The four Backend type-correction checkpoints are now saved and source-reviewed. Controller explicitly narrows address/session values and normalizes RawData with the binary/128 KiB checks retained. Events uses a string guard before trimming. Broker test mocks use production signatures with Object.assign retaining Vitest mock members; all capability/invocation assertions remain. Service details have complete/partial/unknown values aligned to the fictional source. QA and coordinator have been notified that the 25 Backend diagnostics are ready for integrated verification with the one frontend diagnosis. No worker ran tests or altered package/shared/Pages/automation integration for this checkpoint.

The next actual QA typecheck started normally and completed in 7.384 seconds. The preceding 26 diagnostics are absent; it reported only six new mutable readyState literal-type errors in `src/pages-demo/transport.ts` (Pages owner). The following serial scoped run passed all 23 tests across broker, service, and controller files. Overall typecheck remained failing pending that Pages correction and a new integrated QA run. Coordinator authorized a bounded manager recovery only if QA could not legally start checks and confirmed a free window; that exception was not needed while QA's normal commands executed. Manager started no parallel checks.

Pages owner then saved `readyState: number` in the separate transport. QA's subsequent process-local VITE_PAGES_DEMO build exited 0 (2,151 modules), and its Preview on port 4173 served `/easy-web-assistant/` with HTTP 200. The following full `npm run typecheck` completed in 11.483 seconds with exit 0 and no diagnostics. The Backend type-correction handoff is therefore verified by the full compiler run and the 23/23 scoped behavioral tests. These independently completed stages do not imply a fresh full-package-build command or six-flow browser acceptance. The isolated Edge check of the new Pages build hung and ended without a screenshot; new Pages desktop/mobile visual acceptance remains open.
