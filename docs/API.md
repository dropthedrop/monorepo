# Gateway API (initial scaffold)

This document describes the Gateway API endpoints provided by `services/gateway` (minimal implementation).

Endpoints implemented in the scaffold:

- POST /v1/jobs/quote — returns an estimated credit quote for a plan
- POST /v1/jobs/lock — locks credits for a job (returns X-Lock-Handle header)
- POST /v1/execute — executes a single tool step (mocked)
- POST /v1/usage/emit — provider emits UsageEvent (not fully implemented)
- POST /v1/oracle/receipt — gateway accepts oracle receipts (not fully implemented)

See `docs/doc_b.md` for canonical interface definitions and examples.
