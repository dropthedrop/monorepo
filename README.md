# Tokenised API Credits — Monorepo

This repository contains a scaffold implementing the Tokenised API Credits system (Docs A–E).

See docs:
- docs/doc_a.md
- docs/doc_b.md
- docs/doc_c.md
- docs/doc_d.md
- docs/doc_e.md

Layout:
- contracts/ (Foundry)
- services/ (gateway, orchestrator, oracle-agg, tariff, billing)
- infra/ (compose, helm, terraform)
- sdks/ (typescript, python)
- docs/

License: MIT
# tokenised-api-credits (scaffold)

This repository is a scaffolded starting point for the Tokenised API Credits monorepo described in Docs A–E.

See `docs/` for the technical specification and guides:

- `docs/doc_a.md` — Architecture & technical spec
- `docs/doc_b.md` — Interfaces & contract reference
- `docs/doc_c.md` — Project plan
- `docs/doc_d.md` — Deployment/run guide
- `docs/doc_e`   — Copilot Build Guide / Master Instruction

Quick start (dev):

1. Build and start the local compose environment:

   make up

2. Run the demo script (in WSL/Git Bash or a Unix shell):

   ./scripts/demo.sh

Notes
- This is an initial scaffold implementing a minimal Gateway service and local compose configuration. Many components in Doc E remain TODO and are intentionally minimal.


Tokenised API Credits - A Blockchain-Powered AI API Metering System
Core Purpose
This is an enterprise-grade platform that tokenises API calls for AI workloads, providing verifiable usage receipts, programmable prepaid credits, and trust-minimized settlement to API providers. It essentially creates a decentralized billing and metering system for AI/ML API consumption.

What Problem It Solves
API Cost Management: Enterprises struggle with unpredictable AI API costs and lack of granular control
Multi-Provider Billing: Complex reconciliation across different AI providers (OpenAI, Anthropic, Google, etc.)
Usage Verification: No trustless way to verify actual API consumption vs. billing
Budget Control: Difficulty enforcing spend limits across teams and projects
Audit Trails: Lack of immutable records linking usage to payments
Key Components & Architecture
1. Smart Contracts (Solidity on Base L2)
CreditToken: Non-transferable prepaid credits for API usage
CreditVault: Per-tenant vaults that lock/consume/refund credits per job
ProviderRegistry: Manages API provider identities, keys, and payout addresses
UsageReceipts: Accepts aggregated usage proofs from oracles
SettlementTreasury: Handles automatic payouts to providers
CapabilityAuthority: Issues short-lived API access tokens (eliminates static API keys)
2. Gateway Service (TypeScript/Fastify)
Core API endpoints:

POST /v1/jobs/quote - Get cost estimates for planned API calls
POST /v1/jobs/lock - Lock credits for a specific job
POST /v1/execute - Execute API calls with metering
POST /v1/usage/emit - Accept usage events from providers
POST /v1/oracle/receipt - Receive settlement receipts
Security features:

DPoP-style proof headers bound to TLS
Usage-Auth compact tokens (CBOR/JWT)
Real-time budget enforcement
Prometheus metrics (auth_verify_ms, gateway_rps, etc.)
3. Orchestrator Service
An agentic AI system that:

Plans multi-step AI workflows
Manages budgets and enforces spend caps
Applies compliance policies
Provides safety guardrails
Maintains audit trails
4. Oracle Aggregation
Validates provider usage signatures
Computes Merkle roots of usage batches
Performs threshold signing (BLS cryptography)
Submits settlement proofs to blockchain
5. Supporting Services
Tariff Service: Versioned pricing, rate cards
Billing Service: Generates invoices linking jobs → receipts → settlement transactions
SDKs: TypeScript and Python libraries for easy integration
How It Works (Flow)
Funding: Enterprise deposits stablecoins/tokens → mints API credits
Planning: Developer requests quote for planned API calls (chat, embeddings, etc.)
Locking: System locks estimated credits for the job
Execution: Gateway proxies API calls, measures actual usage (tokens, requests, time)
Metering: Provider signs usage events, oracles aggregate and verify
Settlement: Smart contracts automatically pay providers, burn used credits, refund unused amounts
Invoicing: System generates auditable invoices with blockchain transaction links
Enterprise Benefits
Predictable Costs: Prepaid credits with hard budget caps
Multi-Provider: Single interface across all AI providers
Audit Trail: Immutable blockchain records
Real-time Control: Instant budget enforcement and policy application
Detailed Analytics: Token-level usage tracking and cost attribution
Security: No long-lived API keys, capability-based access
Current Implementation Status
This appears to be a sophisticated scaffold/MVP with:

✅ Complete architectural design and specifications
✅ Basic smart contracts (Foundry/Solidity)
✅ Functional gateway with auth stubs and metrics
✅ Docker Compose local development environment
✅ Basic SDKs and test infrastructure
🔄 Production auth implementation (currently using dev tokens)
🔄 Full oracle aggregation (currently simulated)
🔄 Complete billing integration
Technology Stack
Blockchain: Solidity (Foundry), targeting Base L2
Backend: TypeScript, Node 20, Fastify
Infrastructure: Docker, Kubernetes, Terraform
Monitoring: OpenTelemetry, Prometheus, Grafana
Security: mTLS, DPoP proofs, EIP-712 signatures
Databases: PostgreSQL, Redis
This is essentially Stripe for AI API billing but with blockchain-powered transparency, multi-provider aggregation, and enterprise-grade budget controls. It's designed to solve the chaos of AI API cost management that enterprises face when using multiple AI providers.