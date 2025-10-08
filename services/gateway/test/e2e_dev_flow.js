// Use global fetch (Node 18+ provides fetch)
const fetch = globalThis.fetch;

async function run() {
  const base = 'http://127.0.0.1:8080';

  console.log('POST /v1/jobs/quote');
  const q = await fetch(`${base}/v1/jobs/quote`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plan: [{ endpoint_id: 'llm.chat.v1', est_units: 12000 }], tenant_id: '0x01' }) });
  console.log('quote status', q.status);
  const qj = await q.json();
  console.log('quote body', qj);

  // Create a dev usage-auth (base64 JSON)
  const usage = { job_id: 'job-demo-12345', locked_budget_apic: 600, endpoints: ['llm.chat.v1'], expires_at: new Date(Date.now() + 3600_000).toISOString() };
  const usageB64 = Buffer.from(JSON.stringify(usage)).toString('base64');

  // Create a dev DPoP proof (base64 JSON)
  const htm = 'POST';
  const htu = `${base}/v1/jobs/lock`;
  const iat = Math.floor(Date.now() / 1000);
  const jti = 'jti-dev-' + Math.random().toString(36).slice(2,9);
  const dpop = { htm, htu, iat, sig: 'dev-signature', signer: null, jti };
  const dpopB64 = Buffer.from(JSON.stringify(dpop)).toString('base64');

  console.log('POST /v1/jobs/lock');
  const l = await fetch(`${base}/v1/jobs/lock`, { method: 'POST', headers: { 'content-type': 'application/json', 'usage-auth': usageB64, 'dpop': dpopB64 }, body: JSON.stringify({ job_id: 'job-demo-12345', estimated_credits: 600 }) });
  console.log('lock status', l.status);
  const lj = await l.json();
  console.log('lock body', lj);

  const usageToken = lj.usage_auth_token || usageB64;

  console.log('POST /v1/execute');
  const e = await fetch(`${base}/v1/execute`, { method: 'POST', headers: { 'content-type': 'application/json', 'Usage-Auth': usageToken, 'DPoP': dpopB64 }, body: JSON.stringify({ job_id: 'job-demo-12345', tool: 'llm.chat.v1', args: { messages: [{ role: 'user', content: 'Hello from e2e' }] }, budget: 600 }) });
  console.log('execute status', e.status);
  const ej = await e.json();
  console.log('execute body', ej);
}

run().catch((err) => { console.error(err); process.exit(1); });
