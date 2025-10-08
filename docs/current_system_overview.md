## Current system overview (code inspection summary)

This document summarizes the current functionality of the backend services in this workspace and the `apic` frontend. It is based on a quick code inspection of key files in the repo:

- `services/gateway/src/index.ts` (gateway server)
- `services/billing/src/index.js` (billing service)
- `apic/app/page.tsx` (Next.js dashboard UI)
- `apic/lib/gatewayClient.ts` (frontend gateway client)

Use this as a living reference for developers who want to understand: what endpoints exist, how auth works in development, and how frontend and backend communicate.

---

## High-level summary

- Backend: lightweight services scaffolded for a Tokenised API Credits platform. The most complete service is the Gateway (Fastify-based). It exposes quote/lock/execute/emit endpoints, simple Prometheus metrics, and an in-memory/Redis-backed receipt queue for processing usage receipts.
- Billing: very small Fastify service that returns a stub invoice for `/invoice` (port 9091 by default in source).
- Frontend: a Next.js-based admin dashboard (app directory) that displays dashboards, jobs, capabilities, receipts, and provider status. It uses a small client wrapper, `gatewayClient`, to call the gateway endpoints and contains many mock datasets for UI development.

---

## Backend (Gateway) — key points

Path: `services/gateway/src/index.ts`

- Server framework: Fastify
- Metrics: exposes `/metrics` using `prom-client`. Several metrics are registered: `auth_verify_ms`, `receipt_lag_ms`, `queue_depth`, `gateway_rps` and some counters/gauges.
- Queue: uses a `Queue` abstraction (Redis-backed if `REDIS_URL` is provided; otherwise an in-memory Map fallback). Receipts sent to `/v1/usage/emit` and `/v1/oracle/receipt` are pushed onto this queue and processed by an async loop that consumes items and records `receiptLagMs`.
- Auth (development-focused): the `authVerify` function checks for headers `dpop` and `usage-auth`. In non-production the gateway may accept a valid `usage` token alone. The verification helpers come from `./auth` (development stubs). There is a `verifyUsageToken` and `verifyDpopHeader` used. Latency for auth verification is recorded.
- Endpoints provided (important):
  - POST /v1/jobs/quote — accepts a job plan and returns an estimated credit cost and tariff hash. Implementation currently uses a simple estimator and returns a short-lived expiry value.
  - POST /v1/jobs/lock — requires auth (see auth behaviour above). Locks a budget for a job and returns a `usage_auth_token` (development token encoded as base64 JSON), `job_id` and `expires_at`. Also sets `X-Lock-Handle` header.
  - POST /v1/execute — executes an API call under a locked capability/usage token. Currently returns a fixed usage sample (e.g. units/credits) — a dev stub.
  - POST /v1/usage/emit — accepts usage/receipt payloads, enqueues them for processing, returns an id. Kicks off background processing (non-blocking).
  - POST /v1/oracle/receipt — similar to `usage/emit`, used for oracle receipts ingestion.
  - GET /metrics — Prometheus metrics endpoint.

- Dev notes: When run directly `startServer()` writes a `server.started` file in the parent directory. Default bind is `127.0.0.1:8080` (configurable via `PORT`).

### Files referenced while writing this doc
- `services/gateway/src/index.ts` — main server implementation
- `services/gateway/src/queue.ts` — (used but not included here) queue abstraction (supports Redis fallback)
- `services/gateway/src/auth.ts` — dev auth helpers (verify usage token, DPoP) used by `authVerify`

---

## Backend (Billing) — key points

Path: `services/billing/src/index.js`

- Very small Fastify service with one endpoint, `/invoice`, that returns a stubbed invoice object. The service listens on port 9091 in the file.
- Purpose: placeholder/service stub for billing-related actions such as invoice generation.

---

## Frontend (`apic`) — key points

Paths: `apic/app/page.tsx`, `apic/lib/gatewayClient.ts`, `apic/package.json`

- Framework: Next.js (app router) — the `apic` project is a client dashboard and admin UI.
- UI: `app/page.tsx` contains a large Dashboard component which uses mock data for:
  - Jobs (list, details, steps)
  - Capabilities (issue/revoke flows mocked)
  - Receipts & Invoices (tables and invoice modal)
  - Providers and provider metrics
  - Funding wizard (quote -> mint flow is mocked)
- Data & behaviour: the UI currently uses in-file mock datasets for many pages. UI actions (issue capability, revoke, toggle endpoints) currently `console.log` and don't call real APIs, though the wiring for API calls exists in `apic/lib/gatewayClient.ts`.
- Client integration: `gatewayClient` is a small wrapper that implements three main client-side flows:
  - quote(request) -> calls POST `${GATEWAY}/v1/jobs/quote` with a generated DPoP token and returns the JSON response (has robust dev fallback on failure)
  - lock(request) -> calls POST `${GATEWAY}/v1/jobs/lock` with DPoP and returns lock response or mock fallback
  - execute(request, usageAuthToken) -> calls POST `${GATEWAY}/v1/execute` with DPoP + `Usage-Auth` header
  - getTariffs() -> calls a tariff service (`NEXT_PUBLIC_TARIFF_URL`) and falls back to mock tariffs on error

### DPoP / Usage-Auth in the frontend

- `gatewayClient` contains a development DPoP generator which encodes a JSON header and payload using `btoa` and appends a `dev-signature` string (this is a stub — not cryptographically secure). This is sufficient for dev flows because gateway `authVerify` accepts the dev patterns.
- Usage auth tokens are generated as base64 JSON blobs (dev token) by the gateway lock endpoint; the frontend also has a fallback generator for local development.

### Environment variables used

- `NEXT_PUBLIC_GATEWAY_URL` — base URL used by the frontend to reach the gateway (defaults to `http://localhost:8080`).
- `NEXT_PUBLIC_TARIFF_URL` — where the frontend fetches tariff metadata (defaults to `http://localhost:9090`).
- Gateway service: `PORT`, `REDIS_URL`, `NODE_ENV` are used by the gateway.

---

## Typical interaction flow (developer/dev-stubbed)

1. Frontend calls gatewayClient.quote(...) -> POST /v1/jobs/quote (DPoP header included). Gateway returns estimated_credits and expiry.
2. Frontend calls gatewayClient.lock(...) -> POST /v1/jobs/lock (DPoP + potentially usage headers). Gateway performs `authVerify`, returns `usage_auth_token` (base64 JSON in dev) and job_id.
3. Frontend calls gatewayClient.execute(..., usage_auth_token) -> POST /v1/execute with Usage-Auth and DPoP. Gateway validates and returns usage result.
4. Gateway (or other services) POST to /v1/usage/emit or /v1/oracle/receipt to enqueue receipts, which are processed and can later be aggregated into receipts / on-chain receipts.

All auth and token formats in current code are development stubs (base64 JSON tokens and simplistic DPoP formation). Production-grade cryptography and token signing are TODO.

---

## How to run the pieces (developer notes)

- Gateway (dev):
  - Default behavior binds to 127.0.0.1:8080. Ensure Node dependencies are installed and run the service using the existing npm/yarn script in `services/gateway` (not included here) or run the file with `node`/`ts-node` after installing deps. The server writes `server.started` next to the compiled code when it boots.
  - Useful env: `PORT` (default 8080), `REDIS_URL` (enable Redis-backed queue), `NODE_ENV` (affects dev auth behavior).

- Billing (dev stub):
  - The `services/billing/src/index.js` starts a Fastify server listening on 9091 and exposes `/invoice`.

- Frontend (apic):
  - From `apic/` run `npm run dev` (or `pnpm dev`) per `package.json` to start Next.js; default Next dev port is 3000.
  - Set env var `NEXT_PUBLIC_GATEWAY_URL` to point to the running gateway (e.g. `http://localhost:8080`).

---

## Known limitations & TODOs (from reading the code)

- Auth and tokens are development stubs. Replace DPoP generation and usage token encoding with proper cryptographic signing in production.
- Many frontend actions are stubbed or use mock datasets; replace them with live API calls and plumbing to backend services.
- Queue processing is simulated with timeouts and simple processing; verify reliability under Redis-backed mode.
- Tariff and pricing logic is placeholder; production tariff service is implied but not present.

---

## Files to inspect for deeper understanding

- `services/gateway/src/index.ts` — gateway endpoints, metrics, and queue usage
- `services/gateway/src/auth.ts` — dev auth verification helpers
- `services/gateway/src/queue.ts` — queue implementation and Redis fallback
- `services/billing/src/index.js` — invoice stub
- `apic/app/page.tsx` — main dashboard UI and mock data
- `apic/lib/gatewayClient.ts` — frontend client wrapper and dev token behaviour

---

## Next suggested steps

1. Replace dev DPoP signing & usage-token generation with production-safe implementations (contract).
2. Wire frontend actions (issue/revoke capability, fund, invoices) to real backend endpoints and add error handling/UI feedback.
3. Add tests for the queue and receipt processing, plus integration tests for quote->lock->execute flows.

---

Requirements coverage

- [x] Inspect both codebases (gateway, billing, apic) — files reviewed and referenced above.
- [x] Create a docs file in `docs/` explaining current backend and frontend functionality — created `current_system_overview.md` in `Cryptop-gent/docs`.

If you want, I can:

- Open any of the referenced files and produce a more detailed per-function summary.
- Create TODO issues or unit tests scaffolding for the key flows.

EOF
