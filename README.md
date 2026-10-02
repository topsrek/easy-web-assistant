# easy-web-assistant

An assistant for voice and text that aims to present information about events, journeys, and medical appointments in an accessible chat interface. The project currently follows [PRD V0.3](easy-web-assistant-prd.md). It also describes government appointments, services, and leisure activities; those additions require separate acceptance. The source code is public on [GitHub](https://github.com/topsrek/easy-web-assistant).

## Current status

The codebase contains the interface, local profile storage, A2UI cards, controlled fictional test offers, server modules, and model configuration. At an earlier QA checkpoint, **142/142 tests across 15 files** passed (`npm test -- --maxWorkers=1`); a standalone Vite build bundled **2,147 modules** in 1.98 seconds. Those results apply to that earlier state. A limited profile smoke test against the built preview passed **1/1**, covering setup, save, reload, edit, delete, and the session-only fallback. The latest QA update reports a passing TypeScript check and a successful Vite build of the Pages demo; the preview returned HTTP 200 at the repository project path. An isolated Edge UI smoke hung and was stopped without a screenshot. Visual desktop/mobile acceptance and full end-to-end acceptance therefore remain open; a successful `npm run build` has not been established. Implementation and acceptance of the PRD V0.3 additions are still incomplete.

No integration with an existing provider website has been verified. The demo uses clearly labeled fictional test offers only; it does not show real availability, create real bookings, or take payments. See [docs/integration-limits.md](docs/integration-limits.md) for details and [docs/local-start.md](docs/local-start.md) for Windows setup.

## Requirements and startup

The intended local environment is Windows, Node.js 24, and npm 11. The last inspected environment had Node `v24.19.0` and npm `11.17.0`. The intended development startup is:

```powershell
# From the repository root
npm ci
npm run dev
```

`dev` starts Vite and the local Node server. Successful startup has not yet been confirmed; see the current status and [startup guide](docs/local-start.md). There is no login, and the fictional demo does not require an API key. The app is not deployed.

## Privacy and approvals

The profile is intended to be stored in a versioned format in the current browser's LocalStorage. Profile fields are limited to what each task needs; model processing and data transfer to a target website are separate steps. Before any action that changes state, the review should identify the provider, exact fields and values to be sent, known and unknown costs, consequences, and the action requiring explicit confirmation. The demo uses synthetic offer and personal data.

## Model roles

The local configuration assigns Gemini to conversation and task control, Gemma to website interpretation and information structuring, and a separately configured Gemini Live model to voice. Configuration values do not prove that access, model responses, or audio processing have been verified. See [docs/google-cloud-setup.md](docs/google-cloud-setup.md) for details.

The Google Cloud/GDG credit allocation and exact API access route remain unresolved. An automatic switch to Vertex was reverted; demo mode remains active, and unverified local keys remain disabled. Model roles are configuration only, not a confirmed live connection.

## Development

The available npm scripts are defined in `package.json`: `dev`, `start`, `test`, `test:e2e`, `typecheck`, and `build`. Under the project contract, QA owns comprehensive project checks, including typecheck and build. The latest typecheck passed, but the full `npm run build` and browser acceptance remain unverified. See the [QA status](docs/acceptance.md) for detailed results.
