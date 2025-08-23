# Doc C — Full Project Plan: Tokenised API Calls for AI

Version v0.1 (22 Aug 2025)

---

## 1. Executive overview

Objective
Build an enterprise‑grade system that tokenises API calls in AI workflows with chain‑anchored security, verifiable usage receipts, programmable credits, and trust‑minimised settlement. The platform targets multi‑provider, multi‑framework agentic AI deployments with strong budgets, policies, and auditability.

Base chain decision for MVP
• **Base (OP Stack)** for pilot: fast L2 finality, low fees, mature tooling, Coinbase‑backed infra, and straightforward developer experience.
• **Testnet**: Base Sepolia for dev/staging.
• **Lock‑in minimisation**: contracts follow EVM standards, avoid chain‑specific precompiles, encode parameters via storage not constants, and centralise addresses in a `ChainRegistry` to enable relocation.
• **Migration path**: if adoption succeeds, graduate to our **own OP Stack rollup** or **Arbitrum Orbit** chain; a **Polygon CDK** zk path remains an option for stricter settlement assurances.

---

## 2. Scope and deliverables

MVP scope
1 CreditToken, CreditVault, UsageReceipts, ProviderRegistry, SettlementTreasury, ParamGovernor, CapabilityAuthority, SessionChannels (see Doc A/B).
2 Metered Gateway, Agentic Orchestrator, Oracle Aggregators, Tariff Service, Billing/Invoices, SDKs (TS/Python).
3 Chain‑anchored capability auth, DPoP‑style per‑call proofs, enrolled gateways, per‑job channels.
4 Observability, SLOs, and basic admin console.

Post‑MVP
1 Provider certification levels 0–3, ZK proofs option, TEE attestations.
2 Multi‑provider registry, dynamic tariffs, governance parameters.
3 Finance integrations: Xero, NetSuite, SAP, Workday.
4 Enterprise features: SSO, SCIM, private networking, data locality controls.

---

## 3. Success criteria and KPIs

1 Quote‑to‑settlement time ≤ 2 minutes p95; gateway overhead ≤ 100 ms p95 (50 ms target).
2 Receipt acceptance ≥ 99.95% hourly; auth verification ≤ 5 ms p95 at provider edge.
3 Reconciliation accuracy: invoice lines match on‑chain consumption within ±0.1%.
4 Pilot adoption: ≥ 3 providers and ≥ 5 enterprise tenants in 90 days.
5 Cost: infra < 20% of gross metered revenue at pilot scale.

---

## 4. Architecture summary (see Doc A)

Layers
On‑chain settlement and accounting; oracle/attestation network; off‑chain gateway and orchestrator; tariff and billing; observability; security and compliance.
Fast‑path security
CapabilityAuthority, enrolled gateways, DPoP‑style proofs, per‑job SessionChannels.

---

## 5. Workstreams

A. Protocol and smart contracts
B. Gateway and orchestration
C. Oracle and attestations
D. SDKs and adapters
E. Tariff, billing, and invoicing
F. Security, privacy, and compliance
G. Infrastructure and SRE
H. BizOps and provider onboarding
I. Governance and token economics (utility credits, reserves)

---

## 6. Milestones and timeline (indicative)

**Phase 0: Inception and specs (Week 1–2)**
• Finalise specs (Doc A/B), plan (this doc), and deployment plan (Doc D).
• Choose Base (OP Stack) and pin toolchain: Foundry, Hardhat, Anvil, Ethers.
• Threat model; preliminary token economics; tariff v1.

**Phase 1: MVP build (Week 3–6)**
• Contracts: CreditVault, UsageReceipts, CapabilityAuthority, SessionChannels.
• Gateway: proxy, metering, capability issuance, DPoP verifier.
• Oracle: aggregator service, threshold signatures (BLS).
• SDKs: TS and Python quote, lock, execute, settle flows.
• Billing: simple invoices with tx links.
• Local e2e under Docker Compose; Base Sepolia deployments.

**Phase 2: Hardening and staging (Week 7–10)**
• Fuzzing and invariants in Foundry; gas and storage optimisations.
• Load tests; chaos drills for oracle loss and chain stalls.
• Security review, static/dynamic scans; dependency SBOMs.
• SLO dashboards; runbooks; data retention and privacy checks.
• Provider Level 0/1 integrations for two endpoints (LLM and embeddings).

**Phase 3: Pilot launch (Week 11–14)**
• Limited tenants on Base mainnet; rate caps and circuit breakers.
• Finance integrations; export to Xero/NetSuite.
• Bug bounty and external audit booked or completed.
• Post‑mortem template; incident drill; go/no‑go gates.

**Phase 4: Scale and governance (Week 15–20)**
• Provider Level 2/3 options (TEE/ZK).
• Governance parameters via timelock; fee splits and reserve policies.
• Evaluate own rollup path; lab test migration dry‑run (see §10).

---

## 7. Base chain rationale and parameters

Why Base (OP Stack)
• Low fees and fast confirmations; EVM parity; shared security via Ethereum L1; strong infra and tooling.
On‑chain parameters initial
• Dispute window: 24 h pilot.
• Aggregator quorum: 3‑of‑5 BLS set.
• Fee splits example: provider 92%, oracles 2%, reserve 3%, protocol 3% adjustable via timelock.

Lock‑in minimisers
• Avoid L2‑specific precompiles; isolate any `bls12` precompile dependency behind upgradeable adapters.
• Addresses resolved via `ChainRegistry` contract and environment config.
• No reliance on non‑portable opcodes.

---

## 8. Migration strategy to own chain (if success)

Targets
1 **Own OP Stack rollup** joining the Superchain for continuity.
2 **Arbitrum Orbit chain** for Nitro stack benefits and flexible settlement windows.
3 **Polygon CDK zk** for validity proofs and optional data availability modes.

Trigger conditions
• Mainnet spend > USD 200k per month, or throughput > 2k RPS at gateway, or governance requirements not met by host L2.

Preparation
• Freeze new tariff versions; close open SessionChannels; snapshot vault balances.
• Deploy new chain contracts; publish `MigrationManifest` with mapping of tenant, balance, provider IDs.
• Set claim windows and prove ownership via tenant admin keys.

Cutover
1 T‑7 days: announce migration, publish manifest, open dry‑run on staging.
2 T‑24 h: pause new jobs, allow in‑flight settlement, close remaining channels.
3 T‑0: mint credits on new chain from manifest and disable old vault; bridge reserve and protocol funds.
4 Post: re‑enable jobs; monitor dual‑write telemetry for 48 h.

Rollback
• If issues, keep old chain contracts paused but reversible to resume within 24 h; maintain reconciliation diffs per tenant.

---

## 9. Team roles and RACI

Roles
• Product/PM, Protocol Eng, Solidity Eng, Backend/Gateway Eng, Oracle Eng, SRE, Security Eng, DevEx/SDK, Data/Finance Ops, Legal/Compliance.

RACI highlights
• Smart contracts: A Protocol Eng, R Solidity Eng, C Security Eng, I PM.
• Gateway/orchestrator: A Backend Eng, R SRE, C Security Eng, I PM.
• Oracles: A Oracle Eng, R Protocol Eng, C Security Eng, I PM.
• Compliance: A Legal/Compliance, C Security Eng, I PM.
• Launch: A PM, R SRE, C Security/Legal, I All.

---

## 10. Compliance and privacy

• Optional KYC for payouts; sanctions screening for providers.
• Data minimisation: no payload storage; redact logs; hashed identifiers.
• Data locality: per‑region stacks; Australian region available.
• Invoices: signed, with tx links and receipt hashes; audit‑ready.

---

## 11. Security plan

• Key management: HSM/KMS; threshold signing for oracles; rotation playbooks.
• Contract audits: internal review + external audit before Phase 3.
• Fuzzing/invariants: conservation, non‑overlap, payout bounds.
• Bug bounty: responsible disclosure with rewards escrowed in reserve.
• Supply chain: SBOMs, image signing with Cosign, provenance attestations.

---

## 12. Testing and QA

• Unit and property tests for contracts; gas profiles.
• E2E Compose harness; golden test vectors in Doc B.
• Load and chaos tests; failure injection for oracles, gateways, and chain RPC.
• UAT scripts for finance teams and providers.

---

## 13. SRE and observability

• SLOs: gateway p95 latency ≤ 100 ms; receipt finality ≤ 2 minutes; acceptance ≥ 99.95%.
• Telemetry: OpenTelemetry traces by JobID; metrics for auth verify time; logs with redaction.
• Alerts: SLO burn, error spikes, oracle lag, revocation freshness > 10 s.
• Runbooks: chain RPC failover, oracle set rotation, rate‑limit storms, partial region loss.

---

## 14. Budget and unit economics (pilot estimates)

• Infra: USD 8–15k per month across EKS, RDS, Redis, storage, logging; can be ≤ USD 3k in dev/staging.
• Contract gas: \~USD 0.01–0.10 per batch depending on chain congestion; session channels reduce on‑chain calls.
• Audit: USD 40–120k one‑off depending on scope.
• Reserve: 1–3% of gross metered revenue for disputes and risk.

---

## 15. Risks and mitigations

• Provider non‑cooperation mitigate with proxy mode Level 0 while negotiating Level 1 keys.
• Oracle collusion mitigate via diverse operators, staking, and slashing.
• Chain outage mitigate with RPC multi‑provider, backlog queues, and receipt buffering.
• Cost spikes mitigate with dynamic tariffs bounded by governance caps.
• Regulatory change mitigate with modular KYC gates and regional deployments.

---

## 16. Launch plan

• Private pilot with 2–3 providers and design partners; SLA backed.
• Expand to 5–10 tenants; publish public tariff; open bug bounty.
• Quarterly governance review; consider migration to own rollup if triggers met.

---

## 17. Appendices

A. Environment map and addresses
B. Go/no‑go checklist
C. Incident response template
D. Migration manifest format
E. Provider certification checklist (Levels 0–3)
