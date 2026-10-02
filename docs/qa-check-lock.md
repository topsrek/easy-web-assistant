# QA check lock

Owner: PRD10 QA

Purpose: serialize resource-intensive workspace checks while Windows has been returning native memory-allocation / process-start failures. This file is the coordination record; update it before starting each shared comprehensive check and after that command completes or is stopped.

## Current lock

- Status: **HELD by PRD10 QA**
- Phase: profile Preview smoke passed on system Edge with real rendered screenshots. Continue with one mobile flow, then six category flows serially against the same built Preview and explicit test backend.
- Exclusive checker: PRD10 QA only (typecheck and build must run sequentially)
- Browser install/run: install attempted under `.playwright-browsers` with `PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers`; CDN downloads timed out after 30 seconds (exit 1). System Edge is installed; Playwright config now permits `PLAYWRIGHT_CHANNEL=msedge` for the runner. Do not start tests while the dependency tree is being repaired.
- Last result: `npm test -- --maxWorkers=1` passed 15 files and 142 tests in 7.27s. `vite build` transformed 2,147 modules in 1.98s. Preview profile E2E passed 1/1 in 21.1s; screenshots captured at `.cache/qa-visual/desktop-profile-setup.png`, `desktop-profile-complete.png`, and `desktop-profile-reloaded-editor.png` (1280x720). The dev-server white-page issue is bypassed by production preview for visual checks.
- Lock acquired: 2026-10-02 (America/Los_Angeles)

## Run ledger

| Sequence | Check | State | Result / notes |
|---|---|---|---|
| 1 | Unit + integration suite (`npm test`) | Complete, exit 1 | Supported retry completed: 12 files, 131 passed / 1 failed. Failure: `tests/appointments.test.ts:137` expects `/different website origins/i`; provider throws `Appointment information or images have a different source origin.` No integration-test failures were reported. |
| 2 | Typecheck (`npm run typecheck`) | Complete, exit 1 | Stopped after >100s without output; exact QA TypeScript process was identified before interrupt. No successful typecheck. |
| 3 | Build (`npm run build`) | Complete, exit 1 | Stopped after 85s in the same silent TypeScript step; no Vite bundling ran. No successful build. Do not repeat this compiler loop. |
| 4 | Browser install in local path | Complete, exit 1 | `PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers`; repeated Playwright CDN requests for Chrome timed out after 30s. No browser tests started. |
| 5 | Profile E2E smoke (`npm run test:e2e -- --grep "profile survives reload"`) | Complete, exit 1 | Edge launched; page navigation exceeded 30s waiting for `load`. Trace has HTML but the three Vite module requests remained pending; no profile assertions ran. |
| 6 | Vite dev module endpoint probe | Complete, stopped | Isolated demo server became Vite-ready in ~4s; endpoint probe got no response to `/` within 15s. Vite logged dependency scanning/bundling; server was stopped cleanly. |
| 7 | Profile E2E smoke retry (`npm run test:e2e -- --grep "profile survives reload"`) | Complete, exit 1 | Waiting for transformed `/src/main.tsx` did not prevent a 30s page-load timeout; trace confirms initial React responses but several Vite modules stayed pending. |
| 8 | Profile E2E smoke retry with 120s test timeout | Complete, exit 1 | Navigation passed after first-run Vite optimization; stale helper failed waiting for a profile-save banner that is immediately unmounted by the intended auto-close flow. |
| 9 | Profile E2E smoke after helper correction | Complete, exit 1 | First stale close assertion was removed; a second equivalent stale close remained after editing and caused the 120s timeout. |
| 10 | Profile E2E smoke after remaining helper correction | Complete, exit 1 | Setup, reload, and profile edit/save passed; remaining stale `Close` selector after successful save timed out. Helper now expects auto-close there too. |
| 11 | Independent offline regression tests (`npm test -- tests/review/astra-overall.test.ts`) | Complete, exit 0 | 1 file, all 3 tests passed in 850ms. Covers journey time filtering, visible source conditions, and late receipt preserving the next task with mocks; no live provider/browser. |
| 12 | Profile E2E smoke after helper correction | Complete, exit 1 | The test timed out at navigation before profile assertions; Vite readiness returned app entry but `page.goto('/')` stalled for 120s. |
| 13 | QA server process/trace diagnosis | Complete | No leftover QA Vite process remains. Screenshot and network trace confirm white page and stalled Vite module responses; no visual acceptance obtained. |
| 14 | Unit + integration suite on repaired dependency tree (`npm test -- --maxWorkers=1`) | Complete, exit 0 | 15 files, all 142 tests passed in 7.27s (confirmed exit code 0). |
| 15 | Typecheck on repaired dependency tree | Pending | One attempt may follow the isolated Vite bundle check; verify no orphaned native `tsc.exe` from earlier runs before any compiler command. |
| 16 | Isolated Vite bundle (`vite build`) | Complete, exit 0 | Vite 8.3.2/Rolldown built 2,147 modules in 1.98s; JS 604.54kB, CSS 24.92kB; one large-chunk advisory. This does not verify TypeScript. |
| 17 | Preview + demo backend Edge profile smoke on 5173 | Complete, exit 1 | Refused to start because a separate `D:\DEV\machine-literacy` Vite process owns port 5173; no server or UI page was started by this attempt. |
| 18 | Preview + demo backend Edge profile smoke on 4173 | Complete, exit 0 | 1/1 passed in 21.1s. Saved three profile screenshots at viewport 1280x720 using synthetic data; setup, stored profile, and reloaded editor rendered. |
| 19 | Preview + demo backend Edge mobile smoke | Running | Verify mobile UI, browser screenshot persistence, 44px controls, keyboard selection, and 200% zoom; capture `.cache/qa-visual/mobile-*` frames. |
| 20 | Six vertical acceptance flows | Pending | Run after mobile smoke and review of current flow contract assertions; one worker, built Preview, Edge, explicit demo backend. |
| 21 | Typecheck after repaired dependencies | Pending | Perform only after browser checks; sequence separately from any build step. |

Update this ledger and set the current active sequence before launching it. When finished, record the real exit code/output and return the lock to **HELD / no command running**. Do not report a pending row as passing.
