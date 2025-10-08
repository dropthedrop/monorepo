import cbor from 'cbor';
import { ethers } from 'ethers';
// use global fetch
import { startServer } from '../src/index';

(async ()=>{
  const server = await startServer();
  try {
    const wallet = ethers.Wallet.createRandom();
    const payload = { tenant: '0x01', job: 'job-test' };
    const sig = await wallet.signMessage(JSON.stringify(payload));
    const token = { payload, sig, signer: wallet.address };
    const tokenc = cbor.encode(token).toString('base64');

  const iat = Math.floor(Date.now() / 1000);
  const htm = 'POST';
  const htu = 'http://127.0.0.1:8080/v1/jobs/lock';
  const jti = Math.random().toString(36).slice(2,10);
  const dpopMsg = `${htm}:${htu}:${iat}`;
  const dpopSig = await wallet.signMessage(dpopMsg);
  const dpopProof = { htm, htu, iat, sig: dpopSig, signer: wallet.address, jti };
    const dpopB64 = Buffer.from(JSON.stringify(dpopProof)).toString('base64');

    // call lock to trigger auth histogram
    await fetch('http://127.0.0.1:8080/v1/jobs/lock', { method: 'POST', headers: { 'content-type': 'application/json', 'usage-auth': tokenc, 'dpop': dpopB64 }, body: JSON.stringify({ job_id: 'job-test', estimated_credits: 1 }) });

    // get metrics and assert auth_verify_ms exists
    const m = await fetch('http://127.0.0.1:8080/metrics');
    const txt = await m.text();
    console.log('-- metrics snippet --');
    const lines = txt.split('\n').slice(0,80).join('\n');
    console.log(lines);
    if (!txt.includes('auth_verify_ms')) {
      console.error('auth_verify_ms not present');
      process.exitCode = 2;
    } else {
      console.log('auth_verify_ms present');
    }
  } finally {
    await server.close();
  }
})();
