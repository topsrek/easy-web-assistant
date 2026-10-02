# GitHub Pages demo

The project Pages site is a static, browser-only demonstration built from `main` by `.github/workflows/pages.yml`. The workflow uploads only Vite's `dist/` output as a GitHub Pages artifact and deploys it through the `github-pages` environment. It does not publish a branch or commit generated files.

The published build selects an in-memory transport at compile time with `VITE_PAGES_DEMO=true`. It uses the same checked client/server event schemas and A2UI surface renderer as the local application, with six fixed fictional listings. Search, selection, consent review, and results are simulations in the current browser tab. The profile remains in browser storage. No WebSocket, model API, microphone, external provider website, real booking, payment, appointment, service engagement, or enrollment is available in this demo.

Every page of the hosted application must visibly say that it is a browser demo. The Website panel is a static preview of a fictional fixture, not a screenshot or a remotely controlled browser. Approval and result copy must say that the action is simulated and no real transaction or provider request occurred. Voice controls are unavailable in this build.

## Build configuration

The Pages build sets `VITE_PAGES_DEMO=true`; Vite uses the project-site base `/easy-web-assistant/` in that mode. Local development keeps the existing `/` base and WebSocket transport. Fixture images are bundled from `src/pages-demo/assets/`, and all app/catalog/asset URLs must work beneath Vite's `BASE_URL`.

The workflow uses the lockfile with `npm ci` on Node.js 24, runs `npm run typecheck`, installs Chromium, builds the static Vite app, and runs `src/pages-demo/verify.mjs` against the built output under the project-site base. The browser smoke checks page and asset MIME types, the visible demo disclosure, disabled voice, all six fictional result kinds, approval, Stop, Reset, and the absence of external/server requests. It does not run at a mobile viewport. The Pages artifact is uploaded only after these checks pass. The `build` job has read-only repository content permission. Only `deploy` receives `pages: write` and `id-token: write`, depends on the completed `build` job, and publishes to the `github-pages` environment. Deployments are serialized.

## Deployment status

The project site is live at [https://topsrek.github.io/easy-web-assistant/](https://topsrek.github.io/easy-web-assistant/). GitHub Actions run [37078417303](https://github.com/topsrek/easy-web-assistant/actions/runs/37078417303) passed the Chromium smoke and deployed commit `eafd6073c2cef4752396a53506a5b682f3421f24` through the `github-pages` environment.


## Static-hosting boundary

GitHub Pages serves static HTML, CSS, images, and JavaScript. It cannot run this repository's Node.js server or WebSocket session, browser automation, Google model calls, or server-side credentials. The hosted demo deliberately does not connect to those services. The local application continues to use its existing WebSocket backend.
