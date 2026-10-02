# QA check lock

Owner: PRD10 QA

Purpose: serialize resource-intensive workspace checks while Windows has been returning native memory-allocation / process-start failures. This file is the coordination record; update it before starting each shared comprehensive check and after that command completes or is stopped.

## Current lock

- Status: **HELD by PRD10 QA (no QA command running; corrected preview is root-owned and remains active)**
- Phase: Pages integration is saved. The Pages Vite build passed and the post-fix TypeScript check passed. Root replaced the misconfigured preview with PID 22576 using `VITE_PAGES_DEMO=true` and the explicit Pages base; Root verified the JS and CSS assets now return HTTP 200 with JavaScript/CSS MIME types. This is asset-serving evidence, not browser rendering evidence. QA will not start local browsers or alter the preview.
- Exclusive checker: PRD10 QA only (typecheck and build must run sequentially)
- Browser install/run: the earlier `.playwright-browsers` download attempt timed out. System Edge is available and the local Playwright config supports `PLAYWRIGHT_CHANNEL=msedge`, but current coordination forbids further local browser starts; the Pages workflow's Linux Chromium smoke is the pending browser evidence.
- Last result: Historical repaired-tree suite `npm test -- --maxWorkers=1` passed 15 files and 142 tests before Pages integration. On the Pages source, `npm run typecheck` passed with exit 0 after `readyState` was annotated as `number`. `VITE_PAGES_DEMO=true npx vite build` passed, transforming 2,151 modules (the final `readyState` edit was type-only). Root's corrected preview PID 22576 serves the Pages HTML and assets with verified HTTP 200/MIME types; no browser visual check has passed and no current Pages screenshot exists.
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
| 17 | Preview + demo backend Edge profile smoke on 5173 | Complete, exit 1 | Refused to start because a separate `a separate local project` Vite process owns port 5173; no server or UI page was started by this attempt. |
| 18 | Preview + demo backend Edge profile smoke on 4173 (pre-Pages source) | Complete, exit 0 | 1/1 passed in 21.1s. Saved three synthetic profile screenshots at 1280x720; this does not verify the Pages integration. |
| 19 | Preview + demo backend Edge mobile smoke (pre-Pages source) | Complete, exit 0 | 1/1 passed in 23.8s. Verified the earlier app's 390x844 profile, mobile toggle, controls, keyboard selection and 200% CSS zoom; this does not verify the Pages integration. |
| 20 | Six Pages demo acceptance flows | Pending | The workflow smoke now starts Preview with the explicit `/easy-web-assistant/` base, checks HTML/JavaScript/CSS/SVG MIME types, scopes card/approval/result checks to the newest history entries, and runs a TypeScript check for this commit. It does not set a mobile viewport. The GitHub Linux runner has not executed; no Pages browser flow has passed yet. |
| 21 | Typecheck after Pages integration and `readyState` fix | Complete, exit 0 | `npm run typecheck` completed with no diagnostics. |
| 22 | Pages Vite build | Complete, exit 0 | `VITE_PAGES_DEMO=true npx vite build`; 2,151 modules transformed. Built before the final type-only `readyState:number` edit. |
| 23 | Pages preview + subpath / asset checks | Partial (Root readback) | Initial QA PID 35884 returned the HTML entry but wrong HTML for assets. Root replaced it with PID 22576 using the Pages base and verified JS HTTP 200 `text/javascript` (618,149 bytes) and CSS HTTP 200 `text/css` (26,953 bytes). Still no browser-rendered UI proof. |
| 24 | Isolated Edge DOM smoke on the Pages subpath | Stopped, exit 1 | Edge attempt produced no output or screenshot and was stopped after hanging. No UI or runtime assertion passed; do not retry locally per coordination. |
| 25 | Broker, service and controller tests on corrected sources | Complete, exit 0 | 3 files, 23/23 tests passed before Pages integration was complete; scoped evidence only. |

Update this ledger and set the current active sequence before launching it. When finished, record the real exit code/output and return the lock to **HELD / no command running**. Do not report a pending row as passing.
