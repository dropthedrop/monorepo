# Doc D — Local→Cloud Deployment & Scaling Plan

Version v0.2 (23 Aug 2025)

---

## 0. What changed in v0.2

• Added **APX Token Launch & Cloud Rollout Playbook** integrated into the deployment path.
• Added **Funding tracks (No‑ICO / Private SAFT / Public Sale)** with gates and costs.
• Added **\$50 pilot flow** checklist for staging→mainnet.
• Clarified Base (OP Stack) usage and migration readiness.

---

## 1. Objectives

1 Full local parity to build and test offline.
2 Safe promotion to single‑region cloud, then multi‑region.
3 Guardrails for cost, security, privacy, and compliance at each step.
4 Chain‑agnostic design with **Base** as MVP chain and a path to our own rollup.

---

## 2. Environments

**Local**
Docker Compose, Anvil local chain, oracle simulator, seeded data.

**Dev**
EKS in ap‑southeast‑2, Base Sepolia RPC, small RDS/Redis, public Gateway.

**Staging**
Mirrors prod scale factors for load + chaos tests.

**Prod**
EKS ap‑southeast‑2 initially; Base mainnet; HSM/KMS; multi‑region later.

---

## 3. Service topology

**Core services**: Gateway, Orchestrator, Oracle Aggregators, Tariff, Billing, Auth, Console, Telemetry Collector, Postgres, Redis.
**Blockchain**: RPC providers with failover, on‑chain indexer, events consumer.
**Security**: mTLS termination, Capability issuer, Revocation pusher.

---

## 4. Local developer stack (Compose)

`docker compose up` brings: Postgres, Redis, Gateway, Orchestrator, Oracle‑sim, Tariff, Billing, OpenTelemetry, Jaeger, Prometheus, Grafana, and **Anvil** with auto‑deploy scripts (Foundry).
Make targets: `make up`, `make down`, `make reset`, `make e2e`, `make load`, `make cov`.
Fixtures: golden plans, usage events, attestation signatures, invoices.

---

## 5. Kubernetes layout (EKS)

Namespaces: `gateway`, `orchestrator`, `oracle`, `platform`, `observability`.
Workloads: Deployments + HPA; PDBs; Pod Security Standards baseline.
Networking: Private subnets; ALB + WAF for Gateway/Console; optional API Gateway for rate limits.
Storage: RDS Postgres (Multi‑AZ in prod), Elasticache Redis, S3 for logs/artifacts.

---

## 6. Infrastructure as Code

Terraform mono‑repo with per‑env workspaces.
Modules: VPC, EKS, RDS, Redis, IRSA, ALB, WAF, Secrets Manager, KMS, CloudWatch, S3, Route 53.
Helm charts per service; Kustomize overlays per env.

---

## 7. Secrets and key management

KMS for at‑rest; IRSA for pod identity; Secrets Manager for app secrets and revocation lists; optional CloudHSM for oracle keys; threshold signing, rotation playbooks.

---

## 8. CI/CD

Steps: Lint/type‑check; unit tests; Foundry tests (unit, fuzz, invariants); image build with SBOM + Cosign; Compose e2e; Helm render; stage deploy on main; prod promotion gated by SLO health + approval.

---

## 9. Observability

OpenTelemetry traces with JobID; Prometheus metrics (`auth_verify_ms`, `receipt_lag_ms`, `queue_depth`, `gateway_rps`); Grafana dashboards; SLO/burn‑rate alerts; log redaction at Gateway.

---

## 10. Networking and security controls

mTLS at edges; DPoP bound to TLS exporter; WAF with rate‑limits; least‑privilege security groups; VPC endpoints for AWS APIs; S3 object‑lock for audit logs.

---

## 11. Disaster recovery and backups

Targets: RPO ≤ 15 min; RTO ≤ 60 min (Gateway/Oracle).
Backups: RDS PITR; config/tariff snapshots in S3; contract address snapshots.
Drills: quarterly restores; region evacuation playbooks.

---

## 12. Scaling strategies

Throughput: HPA, per‑tenant queues, dedicated pools for heavy tenants, cell architecture when needed.
Data: read replicas, partitioned tables, TTL for raw logs.
Gateway: fast‑path auth ≤ 5 ms p95 (local capability cache), async receipts, **SessionChannels** to avoid per‑call on‑chain writes.

---

## 13. Multi‑region plan

**Phase A** Active‑passive: warm standby, cross‑region RDS replicas, DNS failover, oracle set spans regions.
**Phase B** Active‑active: independent gateway/oracle cells per region, reconciliation via on‑chain receipts, region pinning for data locality, monthly chaos tests.

---

## 14. Promotion flow & exit criteria

**Phase 0 Local**: e2e green; golden vectors stable; coverage ≥ target.
**Phase 1 Dev**: SLOs under synthetic load; incident drills.
**Phase 2 Staging**: 2× expected pilot load; chaos green; pre‑audit review.
**Phase 3 Prod (minimal)**: rate caps, on‑call SRE, finance reconciliation green.
**Phase 4 Scale**: validated autoscaling; cost/request within target.
**Phase 5 Multi‑region**: successful failover; data locality verified; zero data loss on drill.

---

## 15. Cost controls

AWS Budgets; Kubecost; S3 lifecycle rules; trace sampling; per‑tenant cost dashboards; anomaly alerts; circuit breakers on error/spend spikes.

---

## 16. Runbooks (summaries)

1 Chain RPC outage → failover providers; buffer receipts; degrade gracefully.
2 Oracle rotation → rotate keys, update AggregatorSet, verify submissions.
3 Revocation storm → push updates, drop cache TTL to 1 s, monitor freshness.
4 Key compromise → rotate KMS keys, re‑issue caps, close channels.
5 Error spikes → enable circuit breaker, reduce concurrency, auto‑degrade tools.

---

## 17. \$50 pilot — staging→mainnet checklist

1 **Staging**: enable one paid endpoint in reverse‑proxy mode; secrets in Secrets Manager; add tariff entry.
2 Run demo: quote → lock → execute (chat + embed) → receipt → settlement → refund → invoice.
3 **Mainnet**: fund wallet (ETH gas + USDC); call `TreasuryRouter.mintWithStable($50)` → APIC credits.
4 Run same plan via Gateway; watch receipt tx; download invoice; reconcile to chain.
5 SLOs: Gateway ≤ 100 ms p95; provider auth verify ≤ 5 ms p95; receipt finality ≤ 2 min p95.

---

## 18. APX Token Launch & Cloud Rollout Playbook (optional)

**Goal** Launch our token alongside cloud rollout **without blocking** the core product. Supports **No‑ICO**, **Private SAFT**, or **Public Sale** (only with counsel).

### 18.1 Naming & ticker

Shortlist 3–5 names/tickers; check token lists/explorers/app stores; light trademark search (AUS/US/EU); secure domain/ENS/social; record in `ChainRegistry`.

### 18.2 Pre‑TGE engineering

Deploy `APXToken` (ERC‑20) on Base; `TreasuryRouter`, `RebateModule`, `FeeSplitter` wired to `CreditToken`/`CreditVault`; **Claim Portal** (MerkleDistributor) + **VestingVault**; publish `Tokenomics.md`; configure TWAP + Chainlink price adapters with haircut/deviation caps.

### 18.3 Liquidity & discovery (DEX first)

Uniswap v3 APX/USDC pool on Base; seed small liquidity; narrow initial range; circuit‑breaker bot; verify contracts and publish addresses.

### 18.4 Launch day (TGE)

Open Claim Portal; vesting view; adjust liquidity; announce tariff hash + Router address; monitor anti‑bot rules and price deviation.

### 18.5 Funding tracks

**A. No‑ICO (recommended)**: ship product; small liquidity; rebates funded from protocol fees.
**B. Private SAFT**: accredited investors; KYC/AML; vesting 12–36 months.
**C. Public sale**: only with counsel; KYC/AML, geo‑controls, caps.

### 18.6 Cloud resources for token launch

Reuse EKS; add `claim-portal` web, `price‑watcher` worker, optional `liquidity‑bot`; keys via KMS + hardware wallets; multisig treasury (Safe).

### 18.7 Cost ranges (indicative)

Legal 10–50k; audits (router/distributor) 20–120k; liquidity seed 25–150k; infra delta 300–800/mo.

### 18.8 Gates & rollback

Proceed only when: staging SLOs green; treasury contracts audited; drills passed.
Rollback: pause Router mints; freeze Claim Portal; APIC credits continue unaffected.

---

## 19. Migration readiness

Contracts use EVM‑portable patterns; addresses centralised in `ChainRegistry`; no chain‑specific precompiles; SessionChannels and TreasuryRouter built with pluggable adapters; migration to our own OP Stack/Orbit rollup follows Doc C §8.

---

## 20. Appendices

A Compose & Helm skeletons
B Terraform module map
C Alert catalog & SLO definitions
D Provider edge verifier integration notes
E Data schemas & retention policies
