# easy-web-assistant

An assistant for voice and text that aims to present information about events, journeys, and medical appointments in an accessible chat interface. The project currently follows [PRD V0.3](easy-web-assistant-prd.md). It also describes government appointments, services, and leisure activities; those additions require separate acceptance. The source code is public on [GitHub](https://github.com/topsrek/easy-web-assistant).

## Current status

The browser-only demo is live at [https://topsrek.github.io/easy-web-assistant/](https://topsrek.github.io/easy-web-assistant/). Its GitHub Actions workflow passed typecheck, the static Vite build, the Chromium smoke checks, and deployment for commit `eafd607`. This verifies the hosted demo only; it uses fictional in-memory offers and does not connect to a backend, model API, or provider website.

The broader app includes the interface, local profile storage, A2UI cards, and server modules. The Pages checks do not cover the server-backed app or complete acceptance of the PRD V0.3 additions. See [docs/acceptance.md](docs/acceptance.md) for the evidence and remaining coverage.

## Requirements and startup

For local development, use Windows, Node.js 24, and npm 11. Start the development server with:

```powershell
# From the repository root
npm ci
npm run dev
```

`dev` starts Vite and the local Node server. See the [startup guide](docs/local-start.md) for setup details. The hosted fictional demo requires no login or provider credentials. Local model-backed features may require a provider configured in `.env`.

## Privacy and approvals

The profile is intended to be stored in a versioned format in the current browser's LocalStorage. Profile fields are limited to what each task needs; model processing and data transfer to a target website are separate steps. Before any action that changes state, the review should identify the provider, exact fields and values to be sent, known and unknown costs, consequences, and the action requiring explicit confirmation. The demo uses synthetic offer and personal data.

## Local provider configuration

Copy `.env.example` to an ignored local `.env` file and use the variable names shown there to configure a supported provider for local model-backed features. Keep credentials local and never commit them. The Pages demo does not use provider credentials. See [docs/google-cloud-setup.md](docs/google-cloud-setup.md) for general setup guidance.

## Development

The available npm scripts are defined in `package.json`: `dev`, `start`, `test`, `test:e2e`, `typecheck`, and `build`. Under the project contract, QA owns comprehensive project checks, including typecheck and build. The latest Pages workflow passed typecheck, static build, Chromium smoke, and deployment. The full `npm run build` and manual desktop/mobile acceptance remain unverified. See the [QA status](docs/acceptance.md) for detailed results.
