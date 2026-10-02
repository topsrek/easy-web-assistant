# Configure a local AI provider

The local application can run in demo mode without provider credentials. Model-backed features require a provider configured on the local server.

## Local environment

1. Copy `.env.example` to an ignored local `.env` file.
2. Set `AI_PROVIDER` to a provider supported by the application.
3. Add the provider's credential and configuration variables using the names shown in `.env.example`.
4. Keep credentials in the local environment. Never commit `.env`, paste credentials into chat, or add them to client-side variables such as `VITE_*`.

Provider access and available models depend on the provider account and its current terms. Check the provider's official documentation before enabling model-backed features.

The static GitHub Pages demo uses fictional in-memory fixtures and does not need or use provider credentials. See [github-pages.md](github-pages.md) for the demo's limits.
