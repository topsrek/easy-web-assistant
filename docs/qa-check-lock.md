# QA check record

This record summarizes completed project checks. It does not replace the detailed acceptance criteria in [acceptance.md](acceptance.md).

## Latest Pages workflow

- Date: 2026-10-02
- Run: [37078417303](https://github.com/topsrek/easy-web-assistant/actions/runs/37078417303)
- Result: passed typecheck, the static Vite build, all six Chromium demo flows, asset and MIME checks, and GitHub Pages deployment.
- Live demo: [https://topsrek.github.io/easy-web-assistant/](https://topsrek.github.io/easy-web-assistant/)
- The smoke covers the project-site subpath, visible demo disclosure, disabled voice, six fictional result types, approval, Stop, Reset, and absence of external/server requests. It does not use a mobile viewport.

## Other checks

- Unit/integration suite: 142/142 tests passed before Pages integration; not rerun against the final Pages source.
- Full `npm run build`: not established.
- Manual desktop/mobile visual review and screen-reader review of the hosted demo: open.
- The hosted demo is static and browser-only. Passing checks do not establish real provider access, availability, booking, payment, or voice support.
