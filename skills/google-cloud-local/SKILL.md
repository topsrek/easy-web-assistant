---
name: google-cloud-local
description: Configure and verify server-side Google model access for the local easy-web-assistant app, including Gemini API keys, Vertex ADC, model probes, and billing-credit guidance. Does not deploy the app.
---

# Local Google model management

Do not infer an API route from the words Google Cloud, normal billing, GDG, or a hackathon grant. The user has explicitly rejected an automatic switch to Vertex. Resolve the actual API and grant scope before changing providers or authentication. Preserve unverified keys locally but keep them inactive; never probe them to guess their purpose. The latest human choice overrides earlier route assumptions.

Read `docs/cloud-spec.md` and `docs/google-cloud-setup.md` from the repository before modifying configuration. Preserve the exports consumed by the backend. Use `server/config.ts` and `scripts/google-cloud-preflight.ts`; check installed @google/genai types when changing SDK calls.

Keep keys in the ignored repository `.env`, never VITE_ variables. Preserve existing credentials; inspect only presence or blankness. Never print .env, ADC JSON, access tokens, raw authenticated SDK errors, or credential-bearing URLs. Public status is configuration metadata, not proof of authentication.

Gemma handles website interpretation, planning and information organization; Gemini handles conversation/task control and Live audio. Keep models separately configurable. Verify exact current model IDs and provider route against official docs. Gemma on the Gemini Developer API needs no separately hosted endpoint. Vertex support must be verified for the specific route; do not assume Developer API model IDs work on Vertex.

Run local preflight first. Use explicit model and Live probes to verify access with synthetic prompts and bounded timeouts. Report missing credentials, authentication, quotas, model availability, audio and tool capabilities separately. A successful configuration check or socket connection does not prove usable model/audio output. Demo remains usable without keys.

For cloud credits, inspect the billing account's Credits page and the grant terms. Confirm a project is linked and eligible services before choosing Developer API or Vertex. Never imply that all Google Cloud credits cover all Gemini API charges. Ask for project ID and auth method, never ask for secrets in chat. ADC for local development is distinct from gcloud CLI login.

Scope is local localhost operation. Creating projects/resources, enabling billable services, altering IAM or billing, and deployments require a concrete user instruction for that target. Do not install gcloud or change global configuration as a side effect of local validation.

Official references (recheck when model or billing assumptions change):
- Models and lifecycle: https://ai.google.dev/gemini-api/docs/changelog
- Gemma route: https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api
- API keys: https://ai.google.dev/gemini-api/docs/api-key
- Live: https://ai.google.dev/gemini-api/docs/live-api/capabilities
- Local ADC: https://docs.cloud.google.com/docs/authentication/set-up-adc-local-dev-environment
- SDK: https://googleapis.github.io/js-genai/release_docs/index.html
- Billing credits: https://docs.cloud.google.com/billing/docs/how-to/resolve-issues
- Official local MCP: https://github.com/googleapis/gcloud-mcp (requires installed gcloud and authentication).
- Official remote MCP: https://docs.cloud.google.com/sdk/use-gcloud-mcp (requires a project, Cloud CLI Execution API, OAuth and relevant IAM; not a bootstrap replacement for the first project).
