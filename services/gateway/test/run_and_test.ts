import { startServer } from '../src/index';
// use global fetch available in Node 18+
import cbor from 'cbor';
import { ethers } from 'ethers';

async function run() {
  const server = await startServer();
  try {
  const q = await fetch('http://127.0.0.1:8080/v1/jobs/quote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plan: [{ endpoint_id: 'llm.chat.v1', est_units: 12000 }], tenant_id: '0x01' }) });
    console.log('quote status', q.status);
    console.log('quote body', await q.text());

  // create a quick signed Usage-Auth token for the lock call
  const wallet = ethers.Wallet.createRandom();
  const tokenPayload = { tenant: '0x01', job: 'job-demo-12345' };
  const tokenSig = await wallet.signMessage(JSON.stringify(tokenPayload));
  const token = { payload: tokenPayload, sig: tokenSig, signer: wallet.address };
  const tokenB64 = cbor.encode(token).toString('base64');

  // create a DPoP proof signed by the same wallet for simplicity
  const iat = Math.floor(Date.now() / 1000);
  const htm = 'POST';
  const htu = 'http://127.0.0.1:8080/v1/jobs/lock';
  const jti = Math.random().toString(36).slice(2, 10);
  const dpopMsg = `${htm}:${htu}:${iat}`;
  const dpopSig = await wallet.signMessage(dpopMsg);
  const dpopProof = { htm, htu, iat, sig: dpopSig, signer: wallet.address, jti };
  const dpopB64 = Buffer.from(JSON.stringify(dpopProof)).toString('base64');

  const l = await fetch('http://127.0.0.1:8080/v1/jobs/lock', { method: 'POST', headers: { 'content-type': 'application/json', 'usage-auth': tokenB64, 'dpop': dpopB64 }, body: JSON.stringify({ job_id: 'job-demo-12345', estimated_credits: 600 }) });
    console.log('lock status', l.status);
    console.log('lock headers', Object.fromEntries(l.headers.entries()));

    const e = await fetch('http://127.0.0.1:8080/v1/execute', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ job_id: 'job-demo-12345', tool: 'llm.chat.v1', args: { messages: [{ role: 'user', content: 'Hi' }] }, budget: 600 }) });
    console.log('exec status', e.status);
    console.log('exec body', await e.text());
  } catch (err) {
    console.error('error during smoke', err);
  } finally {
    await server.close();
  }
}

run();
