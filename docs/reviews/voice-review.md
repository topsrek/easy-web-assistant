# Voice review

Date: 2026-10-02  
Scope: `server/voice.ts`, `server/ai.ts`, `server/session.ts`, `shared/schema.ts`, `src/hooks/useAudio.ts`, `src/App.tsx`, `src/hooks/protocol.ts`, and existing AI/voice tests.  
Reference: PRD V0.3 (`easy-web-assistant-prd.md`), `docs/contracts.md`, `docs/acceptance.md`, `docs/qa-check-lock.md`.

## Finding

### V-1 — Completed voice requests never enter the normal task path (confirmed, high)

**Trigger:** With Live voice enabled, start the microphone and finish saying a supported request (for example, “Find a train”).

**Expected:** The shell deduplicates a final user transcript by its stable `id`, sends exactly one ordinary `task` message using `neededProfileFor(kind, locally stored profile)`, and renders the request once. Two later turns with the same text but different IDs both remain valid.

**Actual:** `VoiceSession` emits a final user `transcript` with a fresh UUID and calls its `onTask` callback. `AssistantSession.startVoice()` passes `() => undefined` for that callback. In the frontend, the transcript handler only adds assistant transcripts or non-final transcripts to the timeline; a final user transcript matches neither branch. No `submitTask` call is made. Therefore a completed spoken request is silently ignored: there is no task message, search, or user-visible transcript. The implementation has no transcript-ID dedup set in `src/App.tsx` either.

**Relevant source:** `server/voice.ts` around lines 171–177; `server/session.ts` around lines 227–233; `src/App.tsx` around lines 162–170 and 218–239. Wire schema allows an optional transcript `id` in `shared/schema.ts`.

**Reproduction from source path:** Open the app with a server configuration for which `ready.voiceAvailable` is true, connect voice, then speak a complete supported request. The server emits the final transcript; the registered controller task callback is a no-op, and the UI drops final user transcripts. This is a source-confirmed path defect; I did not use credentials, connect to Google Live, or record microphone audio.

**Regression coverage:** Existing fake-SDK tests verify that `VoiceSession` emits UUIDs and handles equal-text separate turns, but they stop at the voice-session boundary and do not cover controller-to-shell task dispatch. No new test was added because the current suite has no frontend component harness and the QA lock is held for shared checks. Add a focused shell/controller test with mocked socket/voice events before considering this fixed.

## Checks and limits

- Read PRD V0.3, voice contract, acceptance record, QA lock, and the scoped implementation/tests.
- Ran only `npm test -- --run tests/ai.test.ts`: **1 file passed, 14 tests passed**. These are mocked tests; this does not establish live Google connectivity or real microphone behavior.
- Static review found generation checks for pending `getUserMedia`, repeated start guards, track and `AudioContext` cleanup on stop/unmount, PCM16 little-endian conversion, input resampling, bounded base64 validation, all-part output handling, interruption state, UUID-per-completed-turn, and refusal of unexpected voice tool calls. These are source observations, not browser lifecycle or live-audio passes.
- No additional confirmed issue was established for StrictMode cleanup, stop/disconnect races, PCM conversion, output interruption, or sanitized voice errors from the available static review and mocked test output.
- Real microphone capture, Live transport, reconnect behavior under provider interruptions, and audible output remain unverified. The controlled demo reports voice unavailable; demo status is not Live acceptance.
- The shared QA lock remains with PRD10 QA. No global suite, typecheck, build, browser install, or E2E check was started.
