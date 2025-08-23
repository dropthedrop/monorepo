# Doc E — Copilot Build Guide & Master Instruction

Version v0.1 (22 Aug 2025)

---

## 1. Purpose

Give an AI coding agent (e.g. GitHub Copilot/Claude/Code Llama) a precise, copy‑pasteable brief to generate the repository, code, tests, infra, and docs for the system specified in Docs A–D. This is the canonical build plan.

**Context anchors**
• Architecture and requirements: Doc A
• Interfaces and schemas: Doc B
• Project plan and chain choice: Doc C
• Local→Cloud deployment: Doc D

---

## 2. Stack & standards (must‑follow)

Languages
• Contracts: Solidity (Foundry)
• Backend: TypeScript (Node 20, Fastify), minimal Go for high‑perf modules optional
• SDKs: TypeScript and Python
• Oracle aggregator: TypeScript (Nest/Fastify) with BLS threshold lib
• Infra: Docker, Docker Compose, Terraform (AWS), Helm, Kustomize

Security baselines
• mTLS at edges, TLS exporter bound to DPoP‑style proofs
• Chain‑anchored capabilities (EIP‑712) and revocation
• No long‑lived static API keys
• Secrets via env + AWS Secrets Manager locally via `.env.local` only for dev

Performance budgets
• Gateway overhead ≤ 100 ms p95 (50 ms target)
• Provider auth verification ≤ 5 ms p95 (local cache ≤ 5 s)
• Settlement finality ≤ 2 minutes p95

Observability
• OpenTelemetry traces and metrics; JobID spans end‑to‑end
• Prometheus metrics: `auth_verify_ms`, `receipt_lag_ms`, `queue_depth`, `gateway_rps`

---

## 3. Monorepo layout

```
repo/
  contracts/            # Foundry
  services/
    gateway/            # Fast path proxy + metering + cap issuance
    orchestrator/       # Planner + budget mgr + policy engine + auditor
    oracle-agg/         # Aggregators, BLS t-of-n
    tariff/             # Tariff service + signer
    billing/            # Invoice generator
  sdks/
    ts/
    py/
  infra/
    compose/            # docker-compose.yaml, seeds, local anvil
    helm/               # charts per service
    terraform/          # modules for VPC, EKS, RDS, Redis, KMS, WAF
  docs/
    README.md
    OPERATIONS.md
    RUNBOOKS.md
    API.md
  .github/workflows/
```

---

## 4. Contracts to generate (see Doc B for ABIs)

Packages
• CreditToken, CreditVault, ProviderRegistry, UsageReceipts, SettlementTreasury
• ParamGovernor (timelocked), CapabilityAuthority, SessionChannels

Tests
• Unit tests for edge cases
• Invariants: conservation, non‑overlap, payout bounds
• Gas snapshots and fuzzing
• Deploy scripts for Base Sepolia

Outputs
• ABIs in `contracts/out/abi`
• Addresses written to `infra/compose/addresses.json`

---

## 5. Gateway service (Fastify, TypeScript)

Responsibilities
• Reverse proxy to providers with metering
• Capability issuance and revocation push
• Enforced budgets and policies per job
• Emit signed UsageEvents; accept oracle receipts for linking

Endpoints
• `POST /v1/jobs/quote`
• `POST /v1/jobs/lock`
• `POST /v1/execute`
• `POST /v1/usage/emit` (provider optional)
• `POST /v1/oracle/receipt`

Security
• Enrolled gateways keypair (mTLS)
• `Usage‑Auth` compact CWT, EIP‑712 backing
• DPoP header binding method+path+nonce to TLS exporter

---

## 6. Oracle aggregator

• Validate provider signatures, compute Merkle roots, BLS threshold‑sign batches
• Submit to `UsageReceipts.submit()`
• Buffer during chain/RPC failures; expose lag metrics
• Admin tool to rotate aggregator set

---

## 7. SDKs

TypeScript and Python
• `quote(plan)`, `lock(job, credits)`, `run(plan)` with streaming, `settlement(job)`
• Adapters for LangChain, LangGraph, LlamaIndex
• Examples for chat + embed flows and budget caps

---

## 8. Orchestrator (agentic)

Components
• Planner → picks tools by tariff
• Budget Manager → locks/renews credits and caps spend
• Policy Engine → evaluates compliance rules
• Safety → PII redaction and output checks
• Auditor → immutable trail linking job to receipts/tx

---

## 9. Billing & invoices

• Map job → receipts → settlement tx hashes
• Export to CSV/JSON and Xero/NetSuite templates
• Sign invoices; attach tariff hash and versions

---

## 10. Local dev (Compose)

Bring up
`docker compose up` starts Postgres, Redis, Gateway, Orchestrator, Oracle‑sim, Tariff, Billing, OpenTelemetry, Jaeger, Prometheus, Grafana, and Anvil with auto‑deploy.
Seeds
Tenants, tariffs, providers, example jobs, test vectors from Doc B.
Make targets
`make up`, `make reset`, `make e2e`, `make load`

---

## 11. CI/CD

GitHub Actions
• Lint, unit tests
• Foundry tests (unit, fuzz, invariant)
• Build images with SBOMs; sign with Cosign
• Compose e2e on PR
• Staging deploy via Helm; prod gated by checks

---

## 12. Acceptance tests (must pass)

1 End‑to‑end demo
Tenant funds credits, runs multi‑step job, receives invoice with tx links; contract events match invoice exactly.
2 Fault tolerance
Kill an aggregator replica; receipts still settle within SLO.
3 Security
Replay attack attempt fails due to DPoP/TLS binding; revoked capability blocks within ≤ 5 s.
4 Performance
Gateway ≤ 100 ms p95; provider auth verify ≤ 5 ms p95.

---

## 13. Delivery checklist

• Green CI
• Compose up works from clean clone
• Base Sepolia deploys; addresses committed
• Docs and runbooks complete
• Dashboards present metrics listed above

---

## 14. Single‑Paste MASTER INSTRUCTION for the AI coding agent

**Copy everything in this section into your AI coding agent.**

"""
You are generating a production‑grade monorepo implementing Docs A–D of the Tokenised API Calls for AI system. Follow these directives exactly:

1. REPO & LICENSE

* Create repository `tokenised-api-credits` (monorepo). Use MIT license and a top‑level README that links to Docs A–E.

2. CONTRACTS (Foundry)

* Implement: CreditToken, CreditVault, ProviderRegistry, UsageReceipts, SettlementTreasury, ParamGovernor, CapabilityAuthority, SessionChannels.
* Add unit tests, fuzz, and invariants for: conservation of credits; non‑overlapping batch windows; payout bounds; capability revocation.
* Provide deploy scripts for Base Sepolia and write deployed addresses to `infra/compose/addresses.json`.

3. SERVICES (TypeScript)

* `services/gateway`: Fastify reverse proxy with metering, capability issuance (EIP‑712), DPoP verifier, and endpoints `/v1/jobs/quote`, `/v1/jobs/lock`, `/v1/execute`, `/v1/usage/emit`, `/v1/oracle/receipt`.
* `services/orchestrator`: planner + budget manager + policy engine + auditor; uses SDK to call gateway.
* `services/oracle-agg`: aggregates UsageEvents, computes Merkle root, performs BLS threshold signing, submits to `UsageReceipts.submit()`.
* `services/tariff`: versioned tariff, signs quotes; publishes tariff hash.
* `services/billing`: generates signed invoices mapping job→receipts→settlement tx.
* Implement OpenTelemetry tracing and the metrics: `auth_verify_ms`, `receipt_lag_ms`, `queue_depth`, `gateway_rps`.

4. SDKS

* TypeScript and Python packages exposing `quote`, `lock`, `run`, and settlement helpers; include LangChain/LangGraph adapters.

5. SECURITY

* mTLS at edges with short‑lived certs.
* `Usage-Auth` compact token (CBOR) backed by EIP‑712 capability; include DPoP‑style header bound to TLS exporter.
* Enrolled gateways list and revocation push channel; provider‑side lightweight verifier library.

6. INFRA

* `infra/compose`: docker‑compose.yaml for local parity (Postgres, Redis, Gateway, Orchestrator, Oracle‑sim, Tariff, Billing, OTel, Jaeger, Prometheus, Grafana, Anvil + deployer).
* `infra/helm`: charts for each service with values for dev/staging/prod.
* `infra/terraform`: modules to create VPC, EKS, RDS, Redis, KMS, WAF, ALB, IRSA, Route 53. Provide variables and outputs only; no secrets.

7. CI/CD

* GitHub Actions: lint/test; Foundry tests; build+sign images; Compose e2e; Helm render; staging deploy on main; prod gated by manual approval + SLO health.

8. SEEDS & TEST VECTORS

* Load the test vectors from Doc B (8.1–8.3). Provide golden JSON files and scripts to replay.

9. DOCUMENTATION

* `docs/API.md` describing Gateway API and SDK examples.
* `docs/OPERATIONS.md` for SRE with runbooks (RPC failover, oracle rotation, revocation storm, key compromise, error spike).

10. MAKE TARGETS

* `make up`, `make reset`, `make test`, `make e2e`, `make load`.

11. ACCEPTANCE

* Provide a `scripts/demo.sh` that: funds credits (mock), locks a job, runs a two‑step plan (chat+embed), prints an invoice with links to tx hashes.
* Ensure performance budgets are met in synthetic tests.

12. OUTPUT

* Return a tree of files, key code snippets, and commands to run: `docker compose up`, then `scripts/demo.sh`.

Assumptions: base chain is **Base** (OP Stack); use Base Sepolia for dev/staging. Do not embed real keys or secrets. Keep modules independent and well‑typed. If a spec detail is unclear, implement the simplest choice that satisfies the interfaces in Doc B and note TODOs in code.
"""

---

## 15. How to use Doc E

1 Open your coding agent and paste the **Single‑Paste MASTER INSTRUCTION** section.
2 Wait for the agent to produce the monorepo scaffold and code.
3 Run `docker compose up` then `scripts/demo.sh`.
4 Verify acceptance tests and metrics; iterate on any TODOs the agent lists.

---

## 16. Future extensions (optional for Copilot)

• ZK usage proofs for privacy‑sensitive endpoints
• TEE attestation at provider edge
• Own rollup migration scripts per Doc C §8
• Additional SDKs (Go, Java)
