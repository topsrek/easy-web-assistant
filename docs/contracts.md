# Backend and frontend contracts v1

Authoritative coordination contract for PRD V0.2. Backend manager owns this file. Controller worker alone owns shared/schema.ts, server/demo.ts and package files. Cloud worker alone owns server/config.ts and .env*. Frontend owns src/**. Provider workers own only their individual provider and test file. tests/profile.test.ts belongs to frontend.

## PRD V0.3 extension (canonical, October 2)

The TaskKind enum is now event/journey/appointment/government/service/leisure. Registry exports governmentProvider (government.ts), serviceProvider (services.ts), leisureProvider (leisure.ts), identical Provider interface. Paths /fixture/government, /fixture/service, /fixture/leisure. Exclusive controller edits schema/registry/inferKind/demo fixtures/index/session; expansion manager owns docs/expansion-spec.md and new provider workers. government and leisure project fullName/email; service fullName/email/phone. No home address by default: a home-visit form requires a separately verified source-specific contract and disclosure. Browser exact local policy covers all six read paths, same mutation gate.

A2UI catalog extends with GovernmentCard, ServiceCard, LeisureCard (leisure can reuse EventCard internals but has its own declared component). Frontend registers six kind/component matches. New fixture offers contain category-specific original fictional facts/images, required unknowns and precise outcomes. No relabelled medical appointments as administrative requirements.

Provider.actionLabel and consequences are authoritative static controller-verified metadata. Broker prepare accepts optional fourth argument provider:Pick<Provider,'actionLabel'|'consequences'> (controller always supplies it), uses allowlisted kind action identity: event/journey/appointment='test_booking', government='test_appointment_request', service='test_service_request', leisure='test_enrollment_request'. Never use offer.selectLabel as final approval button. Add optional result.outcome:'booking_confirmed'|'request_received' to server schema/SubmitResult. For government/service/leisure fixture POST confirms ONLY request receipt, controller text explicitly says request received, not appointment/engagement/enrollment confirmed. Internal state confirmed is verified submission receipt, not invented downstream acceptance. HTTP result includes bound action/outcome and broker verifies session/offer/action/ref/outcome.

All six flows need distinct targeted provider and integrated UI/approval evidence. Expansion unit tests alone do not satisfy complete acceptance. QA alone executes whole-project checks with docs/qa-check-lock.md.

## Wire protocol

Local backend 127.0.0.1:3001, frontend 127.0.0.1:5173, WS /ws. HTTP GET /api/health reports safe readiness only. Sessions are per socket, ephemeral. Export createAppServer for integration tests with configurable port/origin; importing index.ts must not start a server. Normal CLI invocation starts server. No login, deployment or real payment.

Retain existing Profile, emptyProfile, Offer and client message shapes for compatibility. task.profile and confirm.profile contain only needed fields; unused fields empty. Controller projects again with detailsFor before website processing and never forwards full profile to models. Expose neededProfileFor(kind,profile) from shared schema so shell can project fields. Required website fields: event fullName/email; journey fullName/email/accessNeeds; appointment fullName/email/phone/accessNeeds. Search uses task text only initially; explain model processing explicitly. Any profile_changed message invalidates approval/version even when no new task (add optional protocol variant).

Shared schema exports runtime serverEventSchema and inferred ServerEvent. Keep existing event types. approval adds REQUIRED transmittedFields:Array<{label:string,value:string}>, actionLabel:string, consequences:string[], action:string, site:string. expiresAt is epoch milliseconds. Fields are exact filtered nonempty website payload from controller. result keeps confirmed/unclear. status existing idle/working/paused/waiting/complete plus optional phase:'prepared'|'submitted'|'confirmed'|'unclear'. browser.image is JPEG data URL, url actual browser URL, updatedAt ISO timestamp. ready.mode refers provider test/demo status; model enabled does not imply real provider integration.

Offer retains generic facts/details to support all three cards. Extend fact/detail with optional sourceUrl, completeness:'complete'|'partial'|'unknown' default complete only for controlled fixtures. Every mandatory provider field represented as known or 'Unknown'; unknown price stays null; unknown fee cannot become zero or known total. Fixtures are original fictional test provider material, visibly marked. No invented real availability/result.

buildOfferSurface emits genuine v0.9 createSurface/updateComponents/updateDataModel, stable CATALOG_ID https://easy-web-assistant.local/catalogs/everyday-v1.json. Root component by kind EventCard/JourneyCard/AppointmentCard, props offer, disabled bound /disabled, onSelect event select_offer context {offerId,version}. No executable content or profile data.

## Providers

Each module events.ts/journeys.ts/appointments.ts exports named provider eventProvider/journeyProvider/appointmentProvider with the SAME structural interface (define Provider in shared/schema.ts):

```ts
interface Provider {
  kind: TaskKind;
  search(browser: {readOffers(kind:TaskKind):Promise<Offer[]>}, text:string):Promise<Offer[]>;
  requiredFields: Array<keyof Profile>;
  actionLabel: string;
  consequences: string[];
}
```

Provider only searches and structures verified readOffers data; cannot submit/finalize. Check kind/schema/source origin, preserve images/facts/details, supplement fixture-specific missing mandatory facts truthfully. Conditions supplied by task must not be silently changed: unmatched date/location/access constraints report no verified match or explicit fixed-demo limitation. Worker may export pure normalize function for tests. demoOffers remains controller-owned source fixture; provider enhancements occur in provider module, not demo.ts. Controller builds fixture from provider-verified offers if needed by passing optional offers to fixtureHtml.

## Approval and broker

Selection supplies the authoritative kind-specific minimal profile after classification: client `select` adds optional `profile: Profile`, projected from the local saved profile using the selected current card's actual `offer.kind`. Controller validates offer/version, reprojects by that actual kind before `broker.prepare`, and binds the resulting currentProfile for confirmation. A legacy selection without profile uses the existing projected profile. Unknown local task hints may send an empty search profile; selection must supply the actual-kind projection. No full-profile fallback. Stop/reset/profile_changed invalidate pending selection/approval by version as before.

Results add optional `version`, `kind`, and `offerId`, captured from the original confirmation operation before awaiting submission. Late receipts remain visible in history with their original kind/outcome; they cannot clear a newer pending binding or complete/change a newer task. The shell appends every valid result to history but changes active approval/status only for its current version. Controller async success/error/cleanup branches must guard updates by the captured operation version.

approval.ts exports detailsFor(kind,profile):Record<string,string>, ApprovalGate. Define ApprovalBinding in approval.ts: {action:string,site:string,offerId:string,inputs:Record<string,string>,amounts:{price:number|null,currency:string,unknownCosts:string[]},version:number}. issue(binding,now?) returns token/version/offerId/expiresAt and binding/digest. consume(token,binding,now?) compares complete canonical binding and digest, single-use, five-minute expiry. invalidate clears. Profile/input/offer/amount/site changes invalidate. Do not retain unnecessary profile fields.

broker.ts exports ToolBroker(browser:BrowserSession,gate:ApprovalGate), prepare(offer,version,profile): {binding,approval,transmittedFields,actionLabel,consequences}, submit(token,binding):Promise<{state:'confirmed'|'unclear',reference?:string}>, stop(), reset(). One mutation lock; no auto repeat; stop before submission prevents action, stop after submission preserves uncertainty and checks provider state. Broker is sole finalizer. Browser capability is narrowly scoped to selected session/offer/action/payload, consumed by server fixture POST; raw HTTP/form/direct book cannot bypass current approval. Expose controller-facing authorizeFixtureSubmission(sessionId,offerId,inputs) or equivalent capability check on broker with exact identity, one-use, in-flight grant only. Controller fixture POST must enforce it before any mutation; reject absent/stale/unbound grant. GET result is read-only and session scoped. Capability must not appear in UI/socket events/logs.

BrowserSession retains constructor(origin,sessionId), readOffers, snapshot, close. Only same exact loopback origin fixture routes and known images; reject redirects/external/mutation except broker-issued capability. submitPrepared(binding,capability) and checkResult(binding) implement verified fixture completion; no public unrestricted book. Browser and broker worker may refine internal capability API but must document exports in docs/backend-spec.md via result report (manager updates document). Provide safe deterministic fake adapters for unit tests.

Lost-response recovery is a single read-only exact-invocation check, never a second POST. recoverResult(binding,capability) calls /fixture/state with bound session/offer/action and private header x-fixture-operation-token containing the current grant capability. Controller stores a hash of that capability with the result, compares the header digest, and returns only the exact invocation. A previous receipt for the same session/offer/action must not confirm a later attempt. Capability and digest never appear in UI/wire events/public source URLs. Result records retain exact action/outcome/session/reference; result-by-reference is read-only and same-session scoped.

Original source links use current ephemeral fixture session query (otherwise fixture endpoint denies reads); every fact/detail/image retains reachable source within the current session. Fixture HTML displays all details and mandatory facts. Links expire with session close; no anonymous mutation or real provider claim.

## AI and voice

The user explicitly rejected Vertex. Cloud manager owns clarification and verification of the normal Gemini API/Google Cloud billing route; the exact live setup is still pending that clarification. Keep deterministic demo mode enabled while it remains unverified. The temporary separate Live-region change was withdrawn with its AppConfig property and test. Existing optional Vertex code uses `googleCloudLocation` and does not select the user's route. Do not infer successful model/audio operation from configuration alone.

ai.ts exports AssistantAI(settings=config), interpretTask(text):Promise<{kind:TaskKind|null,text:string}>, summarizeObservation(offers:Offer[]):Promise<string>. Demo deterministic/no API calls. Live Gemini handles conversation/task control; Gemma handles website interpretation/planning/structuring; use explicit cloud config fields (read current config, request missing roles through result). Never let model output create binding or submit. Bounded validated outputs, grounded offer facts, injection-resistant data boundary, no profile in prompts. Errors in readable English. Expose availability/status without secrets.

voice.ts exports VoiceSession(settings,onEvent:(event:ServerEvent)=>void,onTask:(text:string)=>void), start(), sendAudio(base64), stop(). PCM16 signed LE mono 16kHz input, output PCM16 mono24kHz; all response parts handled; transcripts emitted; only completed user task transcript may call onTask; no confirm/booking tooling, spoken yes never submits. Audio length/base64/frame validation; close cleanup. voiceAvailable means configured supported Live transport, failures reported gracefully. No API tests without explicit keys/test authorization; mocked SDK tests mandatory.

Voice task execution has one path: completed user transcript is delivered to shell, which sends one normal task message with neededProfileFor from the user's locally saved profile. Controller onTask callback must not additionally runTask with emptyProfile (that breaks later profile-bound approval) or duplicate the request. A spoken yes/confirmation is never mapped to confirm. Controller returns one user message echo; shell avoids duplicate transcript display. Extend voice.state with interrupted when SDK reports interruption; shell clears pending output audio without stopping microphone. Incoming model PCM parts must be validated as complete PCM16 mono24kHz; process text parts too without duplicating output transcription.

Transcript events add optional id:string. Voice worker assigns one stable UUID per completed user turn; shell deduplicates by ID, not transcript text, so an identical legitimate later utterance remains allowed. Non-final assistant partial transcripts are display-only. Session errors preserve readable fixed AI/voice configuration/auth/quota/model error messages via a safe allowlist, never raw vendor errors or credentials.

## Checks and ownership

QA owns playwright.config.ts, tests/e2e/**, tests/integration/**, docs/acceptance.md. Runs unit/typecheck/build plus vertical six-flow E2E and direct POST bypass/stale/double/stop/unclear checks. If dependencies not ready, implement tests and wait for vertical flow through file/status reads. Use workspace-local .playwright-browsers install with PLAYWRIGHT_BROWSERS_PATH, never external cache writes without approval. Existing system Edge may be selected explicitly by PLAYWRIGHT_CHANNEL=msedge for the QA runner and PLAYWRIGHT_BROWSER_CHANNEL=msedge for BrowserSession, using fresh isolated contexts and no persistent user browser profile. Chromium remains the default. Documentation worker owns README.md, docs/local-start.md, docs/integration-limits.md and may initialize Git only with safe .gitignore, no commit/push/secrets; re-read actual checks before claims.
