# Doc A — Technical Specification & Architecture: Tokenised API Calls for AI

Version v0.1 (22 Aug 2025)

---

## 1. Summary

This document specifies an enterprise‑grade system that tokenises API calls inside AI workflows. It provides verifiable usage receipts, programmable prepaid credits, and trust‑minimised settlement to API providers. The stack spans on‑chain smart contracts for accounting and settlement, an oracle/attestation layer for usage proofs, and off‑chain gateways that meter API consumption. It integrates an agentic‑AI orchestrator that plans multi‑step jobs under hard spend controls and policy guardrails.

**Primary outcomes**

1. Neutral, auditable usage receipts across multiple AI and data providers.
2. Programmable credits locked per job, auto‑refunding unused balances.
3. Automatic, risk‑adjusted payouts to providers on truthful metering.
4. Enterprise controls (budgets, approvals, policies) and full auditability.
5. Chain-anchored, capability-based API-call security with per-job session channels that remove static keys and cut per-call auth overhead.

---

## 2. Goals and Non‑Goals

**Goals**

1. Deterministic reconciliation from job ID to receipt to settlement to invoice.
2. Real‑time budget enforcement per tenant, project, and job.
3. Cross‑provider interoperability via a standard receipt and tariff model.
4. Minimal operational overhead for enterprises and providers.

**Non‑Goals**

1. Building new AI models. The platform orchestrates and meters existing APIs/models.
2. Permanent storage of sensitive payloads. Payloads do not leave tenant boundaries.
3. Public disclosure of usage detail. Receipts reveal only the minimum necessary data.

---

## 3. Actors and Personas

1. **Enterprise Tenant**: owns credits, defines policies, receives invoices.
2. **Developer/App**: calls models and tools via the metered gateway and SDK.
3. **API Provider**: exposes AI or data APIs; receives payouts upon settlement.
4. **Oracle Operator**: aggregates usage events, signs attestations, submits receipts.
5. **Governance/Admin**: manages parameters with timelock; cannot bypass invariants.

---

## 4. Key Definitions

1. **Credit**: a prepaid unit of API capacity denominated in a tariff unit (e.g. model tokens or seconds).
2. **Usage Event**: off‑chain metering record (tenant, job, endpoint, units, cost, ts).
3. **Usage Receipt**: on‑chain commitment to a batch of usage events with signatures.
4. **Tariff**: published rate card mapping endpoints to price per unit and fees.
5. **Job**: a bounded workflow with a budget, policy, and audit trail.

---

## 5. Requirements

**Functional**

1. Tenants deposit supported assets and mint credits one‑for‑one at current tariff.
2. Credits can be locked per job; only metered units can consume the lock.
3. Usage receipts must be verifiable and attributable to providers and tenants.
4. Settlement must pay providers, burn credits, and refund unused locks.
5. Disputes can be raised within a window; fraud leads to slashing of staked oracles.
6. SDKs (TS/Python) expose quote, lock, execute, and settle primitives.

**Non‑Functional**

1. **Latency**: gateway adds ≤ 100 ms p95 overhead per API call; 50 ms target.
2. **Finality**: usage receipts settle within ≤ 2 minutes p95.
3. **Availability**: ≥ 99.9% for gateway and oracle submission.
4. **Privacy**: payload content never leaves tenant; receipts reveal counts only.
5. **Compliance**: optional KYC gating for payouts; auditable invoices.

---

## 6. Architecture Overview

The system is layered into **on‑chain settlement**, **oracle/attestation**, and **off‑chain execution**.

**On‑chain (EVM L2 recommended)**

1. **CreditToken**: ERC‑compatible credit token (non‑transferable by default; allowances to system contracts).
2. **CreditVault**: per‑tenant vault; supports lock(job), consume(job,units), refund(job).
3. **ProviderRegistry**: manages provider identities, payout addresses, tariff references, and signing keys; includes staking and slashing.
4. **UsageReceipts**: accepts aggregated usage batches with threshold signatures; records commitments and links to vault consumption.
5. **SettlementTreasury**: holds stable assets; executes payouts to providers upon accepted receipts; maintains RiskReserve.
6. **ParamGovernor**: timelock‑governed parameters (tariff hash, dispute window, quorum, fee splits).

**Oracle/Attestation**

1. **Aggregator Nodes**: ingest usage events from gateways, validate provider signatures, compute batch roots, sign collectively (t‑of‑n), submit on‑chain.
2. **Key Management**: threshold schemes (e.g. BLS or ECDSA‑t) and rotation; slashable stake.

**Off‑chain**

1. **Metered Gateway**: proxies API calls; measures units (e.g. tokens, seconds, requests), signs events; enforces tenant policies and rate limits.
2. **Agentic Orchestrator**: planner, budget manager, policy engine, tools registry, safety guardrails, auditor.
3. **Tariff Service**: versioned rate card; publishes tariff hash to chain; quotes budgets.
4. **Billing & Invoicing**: generates signed invoices mapping job → receipts → settlement txs.
5. **Observability**: OpenTelemetry, metrics, traces; anomaly detection and circuit breakers.

**Data flow summary**

1. Tenant funds → credits minted → credits locked per job.
2. Gateway executes calls → emits signed usage events.
3. Oracles aggregate → on‑chain receipt → settlement → payouts and refunds.

---

## 6A. Blockchain-powered API Call Security (Fast Path)

Objective
Provide cryptographically strong, chain-anchored per-call authorisation that is faster than today’s static keys or OAuth flows by verifying off-chain while anchoring capabilities on-chain.

Components
1 CapabilityAuthority contract issues revocable, time-boxed capabilities binding TenantID, ProviderID, EndpointID, policy hash, budget, and expiry. EIP-712 signed permits; on-chain revocable.
2 Verifiable Gateway Enrolment gateways register with attested metadata optional TEE quote, a pinned mTLS public key, and stake. Providers accept requests only from enrolled gateways.
3 DPoP-style client proofs the SDK signs each request with a nonce and binds it to the capability and TLS channel to prevent replay.
4 Provider Access Verifier a lightweight verifier at provider edges checks mTLS, DPoP, capability signature, budget bounds, and revocation lists without a chain roundtrip.
5 SessionChannels per-job channels pre-lock credits; usage deltas update channel state off-chain and are periodically committed by oracles for settlement.

Fast path request
1 Client includes a Usage-Auth header carrying a compact CBOR Web Token signed by the gateway’s ephemeral key and bound to the capability and TLS exporter.
2 Provider verifies locally mTLS, DPoP, CWT signature, capability validity and budget window from a cached snapshot refreshed every few seconds.
3 On success, the request proceeds immediately; metering emits an event to oracles; chain interaction happens asynchronously at batch time or on dispute.

Why stronger and faster
1 No long-lived API keys to steal capabilities are revocable and scoped to job, endpoint, and budget.
2 Per-call proofs and TLS binding stop replay and credential stuffing.
3 Off-chain verification is a few signature checks typically ≤ 5 ms while state channels avoid per-call on-chain latency, keeping gateway overhead \~25–50 ms.
4 On compromise, revocation propagates within seconds via push and provider polling; channels close and funds are safe.

---

## 7. Core Data Model

**Identifiers**

* `TenantID` (UUIDv7)
* `ProviderID` (registry key)
* `JobID` (UUIDv7; scoped to tenant)
* `EndpointID` (tariff key)

**UsageEvent (off‑chain)**

```
struct UsageEvent {
  bytes32 event_id;         // hash(job_id || seq || endpoint_id || ts)
  bytes32 tenant_id;
  bytes32 job_id;
  bytes32 provider_id;
  bytes32 endpoint_id;
  uint64  units;            // e.g., tokens, seconds
  uint256 unit_price;       // at time of use (in credits)
  uint64  ts_unix_ms;
  bytes   provider_sig;     // provider metering key
}
```

**BatchReceipt (on‑chain)**

```
struct BatchReceipt {
  bytes32 batch_root;       // Merkle root of UsageEvents
  bytes32 tenant_id;
  bytes32 provider_id;
  uint64  total_units;
  uint256 total_credits;    // to consume from vault
  uint64  period_start_ms;
  uint64  period_end_ms;
}
```

---

## 8. Protocol Flows

**8.1 Tenant Onboarding and Funding**

1. Tenant completes KYC (if required) and creates a vault.
2. Tenant deposits stable asset; Treasury mints `CreditToken` 1:1 at current tariff base.

**8.2 Job Quote and Lock**

1. SDK calls Tariff Service to estimate cost for the plan.
2. Vault `lock(job_id, estimated_credits)`; orchestrator receives lock handle.

**8.3 Execute and Meter**

1. Gateway enforces policy and budget; forwards call to provider.
2. Metering sidecar measures units; signs `UsageEvent` with provider key.

**8.4 Aggregate and Submit**

1. Oracles validate events, compute `batch_root`, `total_units`, `total_credits`.
2. Oracles threshold‑sign the batch and call `UsageReceipts.submit()` with proof.

**8.5 Settle and Refund**

1. `UsageReceipts` verifies signatures, calls `CreditVault.consume(job_id, total_credits)`.
2. `SettlementTreasury.pay(provider,payout)` and `RiskReserve.take(fee)`.
3. Vault `refund(job_id, lock − total_credits)`.

**8.6 Dispute**

1. Within `dispute_window`, tenant can challenge with counter‑evidence.
2. If fraud proven, slash oracle stake and revert/compensate from `RiskReserve`.

---

## 9. Smart Contracts (Responsibilities & Invariants)

**CreditToken**

* Mint/burn restricted to Treasury; optional non‑transferable to third parties.
* Invariant: totalSupply equals sum of tenant vault balances.

**CreditVault**

* `lock(job_id, amount)`, `consume(job_id, amount)`, `refund(job_id)`.
* Invariants: cannot over‑consume; refund ≤ lock; lock scoped to tenant+job.

**ProviderRegistry**

* Register/update providers; manage signing keys; stake and slash.
* Invariant: only active, staked providers may receive settlement.

**UsageReceipts**

* Accept batch with threshold sig; emit events; bind to tariff hash.
* Invariant: credits consumed ≤ locked; batch time ranges non‑overlapping per job.

**SettlementTreasury**

* Hold stable assets; split payouts among provider, oracles, reserve, protocol.
* Invariant: conservation of funds; payout only for accepted receipts.

**ParamGovernor**

* Timelocked updates to parameters; emergency pause with quorum.
* Invariant: no parameter may break vault conservation checks.

---

## 10. Agentic‑AI Orchestrator (Integrated Feature)

Components

1. **Planner** selects tools/models based on task and tariff.
2. **Budget Manager** requests and renews locks; enforces hard caps.
3. **Policy Engine** evaluates data/compliance rules before tool use.
4. **Tools Registry** lists allowed endpoints per tenant with rate limits.
5. **Safety Layer** performs PII redaction and output checks.
6. **Auditor** writes an immutable trail linking job to receipts and tx hashes.

Runtime

1. Receive task and budget; produce plan with estimated cost.
2. Lock credits and execute steps via Gateway.
3. On over‑spend risk, pause for approval or auto‑degrade to cheaper tools.
4. On completion, emit report with links to receipts and invoice lines.

---

## 11. Tariff and Pricing Model (Outline)

1. Unit types: tokens, seconds, requests; per endpoint basis.
2. Price formula: `cost = Σ(units_i × unit_price_i) + provider_fee + network_fee`.
3. Tariff versioning: `tariff_hash` pinned on chain; changes timelocked.
4. Surge/congestion modifiers bounded by governance‑set caps.

---

## 12. Security Model

Threats and Controls

1. **Forged Usage**: require provider side signatures and oracle threshold signatures; replay protection with nonces and windows.
2. **Key Compromise**: HSM/KMS, rotation, scoped privileges, monitored anomaly detection.
3. **Over‑consumption**: vault hard caps; circuit breakers; rate limits per job.
4. **MEV/Front‑run**: commit‑then‑reveal for sensitive parameters; use calldata hashing.
5. **Denial of Service**: backpressure queues, per‑tenant isolation, autoscaling.
6. **Oracle Collusion**: staking/slashing; minimum diversity of operators.
7. **Credential theft**: eliminate static API keys via chain-anchored capabilities and short-lived mTLS with DPoP proofs.
8. **Revocation lag**: providers maintain a cached revocation list pulled every 5 s and accept push updates from gateways.

Formal Invariants (to prove/fuzz)

1. Conservation of credits across mint, burn, lock, consume, refund.
2. No double consumption for overlapping batches per job.
3. Payouts cannot exceed consumed credits minus protocol fees.

---

## 13. Observability and SLOs

1. Gateway latency overhead ≤ 100 ms p95; 50 ms target; track per endpoint.
2. Settlement finality ≤ 2 minutes p95; alert at 5 minutes.
3. Receipt acceptance rate ≥ 99.95% over rolling 1 hour.
4. End‑to‑end e2e trace with JobID spans; anomaly detection on unit deltas.
5. Provider-side auth verification time ≤ 5 ms p95; capability cache freshness ≤ 5 s.

---

## 14. Privacy and Compliance

1. Data minimisation: redact payloads; store hashed request identifiers only.
2. Optional KYC for payouts; sanctions screening for providers.
3. Data locality controls (region‑pinned stacks and keys).
4. Finance exports: signed invoices with tx links and receipt hashes.

---

## 15. Testing Strategy

1. Unit tests for all contract paths; invariant tests (Foundry) for conservation.
2. Property tests for vault locking/consumption across adversarial batches.
3. E2E harness with Docker Compose: gateway, oracle simulator, test provider.
4. Load tests for burst traffic and long‑running jobs; chaos testing for oracles.

---

## 16. Deployment and Environments (tie‑in to Deliverable 4)

1. **Local**: Docker Compose (Postgres, Redis, Gateway, Orchestrator, Oracle Sim, OpenTelemetry, Grafana); Anvil local chain.
2. **Dev/Staging**: Kubernetes (EKS/GKE); public testnet; blue‑green gateway releases.
3. **Prod**: EVM L2; HSM/KMS, timelock governance; multi‑region per scaling plan.

---

## 17. Acceptance Criteria

1. Run a demo: tenant funds credits, executes a multi‑step job, receives an invoice; on‑chain events and txs match the invoice exactly.
2. Survive fault injection: oracle node loss, gateway pod restarts, and delayed batches without violating invariants.
3. Achieve SLOs in staging load test with headroom.

---

## 18. Open Questions

1. Final choice of base chain and rollup (fees, finality, ecosystem).
2. Signature scheme for oracle threshold signing (BLS vs ECDSA‑t) and on‑chain verification cost.
3. Exact dispute process and evidence formats.
4. Whether credits are transferable between tenants under governance rules.

---

## 19. Next Steps

1. Finalise base chain decision and custody model.
2. Freeze minimal viable tariff and endpoints for MVP.
3. Produce Doc B (Interface/Contract Reference with ABIs, schemas, SDK interfaces, and test vectors).
4. Produce Doc C (Full Project Plan) and Doc D (Local→Cloud Deployment & Scaling Plan).

---

## 20. Interoperability & Adoption

Scope
Support enterprises across different agent frameworks, clouds, and providers without code rewrites.

Standards
1 Neutral Usage Receipt and Tariff schemas cover units such as tokens, seconds, and requests.
2 Two provider integration modes native adapter with signed UsageEvents, or transparent reverse proxy via the Metered Gateway.
3 Capability-based security replaces static keys and works with HTTP and gRPC.
4 SDK shims for LangChain, LangGraph, LlamaIndex, OpenAI Assistants, CrewAI, AutoGen, and plain HTTP tools.
5 Multi-tenant by default vaults, budgets, policies, and audit trails are tenant-scoped.

Provider compatibility levels
1 Level 0 HTTP compatible, proxy only; provenance via oracle signatures.
2 Level 1 Provider signs UsageEvents with a metering key.
3 Level 2 Provider adds TEE attestation per batch.
4 Level 3 Zero-knowledge usage proofs for privacy-sensitive endpoints.

Limits and fallbacks
1 If a provider refuses proxying and won’t embed the adapter, network sidecars can meter but provenance is weaker until Level 1.
2 Bespoke streaming protocols use the SDK “custom tool” interface.
3 Legal fallback monthly reconciliation while still enforcing real-time budgets.
