# Workspace Memory — Snapshot (2025-08-22)

This file is an easily human-readable memory for continuing development later.

Summary
- Last verified: Gateway service (Fastify, TypeScript) smoke test passed locally.
- Where to resume: Implement gateway auth (DPoP + Usage-Auth), add extra metrics, scaffold additional services (tariff, oracle-agg), and create contracts stubs.

Last actions performed
- Scaffolded monorepo skeleton and gateway service.
- Added tsconfig, local types for node-fetch; fixed package.json dev deps.
- Created test/launch_and_test.js which launches gateway, waits for port, calls the endpoints, and kills the server.
- Verified endpoints returned expected mock responses: quote, lock (X-Lock-Handle), execute (usage object).

Files to check (recently changed)
- services/gateway/src/index.ts (refactored to export startServer/buildServer)
- services/gateway/tsconfig.json
- services/gateway/package.json
- services/gateway/test/launch_and_test.js
- infra/compose/docker-compose.yaml

Pending tasks (high priority)
1. Implement DPoP and Usage-Auth parsing + revocation cache in `services/gateway`.
2. Add Prometheus metrics `auth_verify_ms` and `receipt_lag_ms` to gateway and wire to /metrics.
3. Create `scripts/demo.ps1` for Windows users or update demo instructions to use WSL/Git Bash.
4. Scaffold `contracts/` (Foundry) with CreditToken stub and basic tests.

How to resume (commands)
Run these from repository root. On Windows PowerShell use the given commands.

```powershell
# Start gateway in a foreground terminal
cd .\services\gateway
npm run start

# Run the launcher-based smoke test (it starts and stops the server automatically)
node .\services\gateway\test\launch_and_test.js

# Alternatively, run the pure-JS test against a running gateway
node .\services\gateway\test\run_and_test.js

# Start the local compose environment (scaffold)
make up
```

Notes
- No secrets or keys are stored in the repo. The demo and smoke tests use mocked responses.
- This memory snapshot is intentionally minimal and focused on the next developer actions.

If you want, I can
- Add `scripts/demo.ps1` and wire the Windows demo.
- Begin implementing DPoP + Usage-Auth stub logic in the gateway.
- Scaffold a minimal Foundry contracts directory with a stub CreditToken.

Pick what to do next and I'll continue from this snapshot.
