# Doc B — Interface & Contract Reference: Tokenised API Calls for AI

Version v0.1 (22 Aug 2025)

---

## 1. Overview & Conventions

* IDs: UUIDv7 unless on-chain where bytes32.
* Timestamps: Unix ms.
* Encoding: Deterministic CBOR for wire messages; JSON examples included; keccak256 domain separation for signatures.
* Crypto: ECDSA secp256k1 for contracts; BLS12-381 for oracle threshold signatures (t-of-n); Ed25519 optional for provider edge libs.
* Security headers: `Usage-Auth` (compact CWT), optional `DPoP`-style header binding to TLS exporter.

---

## 2. Smart Contract Interfaces (Solidity)

### 2.1 CreditToken (restricted ERC-20)

```solidity
interface ICreditToken /* ERC20 subset */ {
  event Mint(address indexed to, uint256 amount);
  event Burn(address indexed from, uint256 amount);

  function totalSupply() external view returns (uint256);
  function balanceOf(address account) external view returns (uint256);
  function approve(address spender, uint256 amount) external returns (bool);
  function allowance(address owner, address spender) external view returns (uint256);

  // Restricted
  function mint(address to, uint256 amount) external; // only Treasury
  function burn(address from, uint256 amount) external; // only Treasury
}
```

### 2.2 CreditVault

```solidity
interface ICreditVault {
  event Locked(bytes32 indexed tenantId, bytes32 indexed jobId, uint256 amount);
  event Consumed(bytes32 indexed tenantId, bytes32 indexed jobId, uint256 amount);
  event Refunded(bytes32 indexed tenantId, bytes32 indexed jobId, uint256 amount);

  function lock(bytes32 jobId, uint256 amount) external; // only tenant controller
  function consume(bytes32 jobId, uint256 amount) external; // only Receipts
  function refund(bytes32 jobId) external; // unlock remainder
  function balanceOf(address tenant) external view returns (uint256);
}
```

### 2.3 ProviderRegistry

```solidity
interface IProviderRegistry {
  struct Provider { address payout; bytes32 tariffHash; bytes32 meterKey; bool active; }
  event Registered(bytes32 indexed providerId, address payout);
  event Updated(bytes32 indexed providerId);
  event Slashed(bytes32 indexed providerId, uint256 amount);

  function register(bytes32 providerId, address payout, bytes32 meterKey) external payable; // stake in msg.value
  function update(bytes32 providerId, address payout, bytes32 meterKey, bytes32 tariffHash) external;
  function deactivate(bytes32 providerId) external;
}
```

### 2.4 UsageReceipts

```solidity
interface IUsageReceipts {
  event BatchSubmitted(bytes32 indexed providerId, bytes32 indexed tenantId, bytes32 batchRoot, uint256 credits);
  error InvalidSignature();
  error OverConsumption();

  function submit(
    bytes32 providerId,
    bytes32 tenantId,
    bytes32 batchRoot,
    uint64  totalUnits,
    uint256 totalCredits,
    uint64  periodStartMs,
    uint64  periodEndMs,
    bytes   aggThresholdSig,
    bytes32 aggSetId
  ) external; // only AggregatorSet
}
```

### 2.5 SettlementTreasury

```solidity
interface ISettlementTreasury {
  event Paid(bytes32 indexed providerId, address to, uint256 amount, bytes32 batchRoot);
  function pay(bytes32 providerId, uint256 amount, bytes32 batchRoot) external; // only Receipts
}
```

### 2.6 ParamGovernor (timelocked)

```solidity
interface IParamGovernor {
  event TariffHashUpdated(bytes32 newHash);
  event DisputeWindowUpdated(uint64 seconds);
  event FeeSplitUpdated(uint16 providerBps, uint16 oracleBps, uint16 reserveBps, uint16 protocolBps);
}
```

### 2.7 CapabilityAuthority (API-call security)

```solidity
interface ICapabilityAuthority {
  struct Capability {
    bytes32 capId;         // hash(tenantId, jobId, endpointId, nonce)
    bytes32 tenantId;
    bytes32 providerId;
    bytes32 endpointId;
    bytes32 policyHash;    // policy at issue time
    uint256 budget;        // max credits usable under this cap
    uint64  notBeforeMs;
    uint64  notAfterMs;
  }

  event Issued(bytes32 indexed capId, bytes32 indexed tenantId, bytes32 providerId, uint256 budget);
  event Revoked(bytes32 indexed capId);

  function issue(Capability calldata cap, bytes calldata eip712Sig) external; // tenant authorised
  function revoke(bytes32 capId) external; // tenant or governor
  function isRevoked(bytes32 capId) external view returns (bool);
}
```

### 2.8 SessionChannels

```solidity
interface ISessionChannels {
  struct ChannelState { bytes32 jobId; uint256 locked; uint256 consumed; uint64 seq; }
  event Opened(bytes32 indexed jobId, uint256 amount);
  event Updated(bytes32 indexed jobId, uint64 seq, uint256 consumed);
  event Closed(bytes32 indexed jobId, uint256 finalConsumed);

  function open(bytes32 jobId, uint256 amount) external; // lock in Vault
  function update(ChannelState calldata state, bytes calldata oracleAggSig) external; // optimistic
  function close(bytes32 jobId) external; // settle remaining lock
}
```

---

## 3. Oracle & Attestation Schemas

### 3.1 UsageEvent (off-chain, CBOR)

Canonical JSON (for docs):

```json
{
  "event_id": "0x7f...",
  "tenant_id": "0x01...",
  "job_id": "0x02...",
  "provider_id": "0x03...",
  "endpoint_id": "embed.text.v1",
  "units": 1024,
  "unit_price": 3,
  "ts_unix_ms": 1724246400123,
  "provider_sig": "base64(bls_or_ecdsa_sig)"
}
```

Signing:

* Provider signs `keccak256(domain || canonical_cbor(UsageEvent))` with `meterKey`.

### 3.2 BatchReceipt (on-chain message)

```json
{
  "batch_root": "0xa5...",
  "tenant_id": "0x01...",
  "provider_id": "0x03...",
  "total_units": 99999,
  "total_credits": 34567,
  "period_start_ms": 1724246400000,
  "period_end_ms": 1724246460000,
  "agg_set_id": "0xagg...",
  "agg_threshold_sig": "base64(bls_sig)"
}
```

Merkle tree leaves are `hash(UsageEvent_cbor)`; root threshold-signed by AggregatorSet.

---

## 4. Metered Gateway API (REST)

Base URL: `https://{tenant}.gw.example.com` (per-tenant subdomain)

### 4.1 Quote

`POST /v1/jobs/quote`

```json
{
  "plan": [{"endpoint_id": "llm.chat.v1", "est_units": 12000}],
  "tenant_id": "0x01..."
}
```

Response

```json
{ "estimated_credits": 480, "tariff_hash": "0x...", "expires_ms": 1724246500000 }
```

### 4.2 Lock

`POST /v1/jobs/lock`

```json
{ "job_id": "uuidv7", "estimated_credits": 600 }
```

Response: 204, header `X-Lock-Handle: <opaque>`

### 4.3 Execute

`POST /v1/execute`
Headers: `Usage-Auth`, optional `DPoP`

```json
{ "job_id": "uuidv7", "tool": "llm.chat.v1", "args": {"messages": [{"role":"user","content":"Hi"}]}, "budget": 600 }
```

Response (stream or JSON)

```json
{ "ok": true, "usage": {"units": 11840, "credits": 474} }
```

### 4.4 Provider Ingest (optional)

`POST /v1/usage/emit`
Provider posts signed `UsageEvent` batch for reconciliation.

### 4.5 Oracle Webhook

`POST /v1/oracle/receipt`
Gateway receives threshold-signed batch receipt for audit linking.

---

## 5. Provider Access Verifier (Edge Library)

Pseudocode

```text
verify(request):
  assert mtls_peer in enrolled_gateways
  assert dpop_proof binds method+path+nonce to TLS exporter
  cap = parse_cwt(request.headers["Usage-Auth"]) // EIP-712-backed
  assert now in [cap.notBefore, cap.notAfter]
  assert cap not in revocation_cache
  assert cap.tenantId == request.tenantId
  assert cap.endpointId == this.endpointId
  assert spend_within_budget(cap)
  return ALLOW
```

Cache refresh: pull revocations and capability snapshots every 5 s; accept pushes from gateway.

---

## 6. SDK Interfaces

### 6.1 TypeScript

```ts
export class Credits {
  static quote(plan: Plan): Promise<Quote>;
  static lock(jobId: string, estCredits: number): Promise<LockHandle>;
}

export class Orchestrator {
  constructor(opts: { policy?: Policy; budget?: number });
  run<T>(plan: ToolStep[]): Promise<{ result: T; usage: Usage }>; // executes via gateway
}

export type ToolStep = { tool: string; args: any; maxCredits?: number };
export type Quote = { estimated_credits: number; tariff_hash: string; expires_ms: number };
export type Usage = { units: number; credits: number };
```

### 6.2 Python

```python
class Credits:
    def quote(plan: Plan) -> Quote: ...
    def lock(job_id: str, est_credits: int) -> LockHandle: ...

class Orchestrator:
    def __init__(self, policy: dict | None = None, budget: int | None = None): ...
    def run(self, plan: list[ToolStep]) -> tuple[object, Usage]: ...
```

---

## 7. Tariff Schema

```json
{
  "version": 3,
  "currency": "CREDITS",
  "endpoints": {
    "llm.chat.v1": {"unit": "tokens", "unit_price": 0.00004, "fee": 0.0},
    "embed.text.v1": {"unit": "tokens", "unit_price": 0.00003, "fee": 0.0},
    "search.web.v1": {"unit": "requests", "unit_price": 0.002, "fee": 0.0}
  }
}
```

Tariff hash: `keccak256(canonical_cbor(tariff))` pinned in ParamGovernor.

---

## 8. Test Vectors

### 8.1 Simple chat

* Plan: 12k tokens → estimate 480 credits (0.00004 each).
* Lock: 600 credits.
* Actual usage: 11.84k tokens → 474 credits.
* Batch root: `0xa5...`.
* Threshold sig (BLS): `0x93...`.
* Settlement tx hash: `0xabc...`.

### 8.2 Two endpoints

* Chat 8k tokens + Embed 2k tokens.
* Receipt totals: `units=10000`, `credits= (8k*0.00004 + 2k*0.00003)`.

### 8.3 Revoked capability

* Cap `capId=0xdead...` revoked at `t=1000`.
* Request at `t=1200` → Provider verifier rejects with `ERR_CAP_REVOKED`.

---

## 9. Error Codes

* `ERR_CAP_EXPIRED`
* `ERR_CAP_REVOKED`
* `ERR_DPOP_INVALID`
* `ERR_GATEWAY_NOT_ENROLLED`
* `ERR_BUDGET_EXCEEDED`
* `ERR_SIGNATURE`
* `ERR_TARIFF_MISMATCH`

---

## 10. Versioning

* Contracts: semver with upgrade gates via timelock.
* Gateway API: `/v{major}` path; additive changes only in minor.
* SDKs: semver; deprecations with compile-time warnings.
