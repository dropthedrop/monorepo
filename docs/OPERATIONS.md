# OPERATIONS (scaffold)

This file is a starting point for Runbooks and SRE procedures.

Runbook: start local stack
1. Ensure Docker is running
2. In repository root run:
   make up
3. Check gateway logs:
   docker compose logs -f gateway

Runbook: oracle rotation (placeholder)
- TODO: add playbook for rotating aggregator keys and updating ParamGovernor

Auth & Metrics (dev slice)

1. The `services/gateway` implements a minimal DPoP+Usage-Auth verification stub for local testing. It expects the request to include headers:
   - `DPoP`: any string
   - `Usage-Auth`: the literal `TEST-USE` for the stub to accept.

2. Metrics exposed at `/metrics` include:
   - `gateway_rps`
   - `auth_verify_ms`
   - `receipt_lag_ms`
   - `queue_depth`

3. To exercise the receipt processing path, POST to `/v1/usage/emit` or `/v1/oracle/receipt` with a JSON body; the in-memory queue will process items with a small delay to populate `receipt_lag_ms`.

4. TODO:
   - Replace the auth stub with real CBOR/CWT parsing and EIP-712 capability verification.
   - Implement enrolled gateways list and a revocation push channel.
   - Add mTLS/short-lived cert automation for local dev (via dev PKI).
