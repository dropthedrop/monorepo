// Lightweight smoke test: quote -> lock -> execute
// Usage (from repo root):
//   $env:GATEWAY_URL='http://127.0.0.1:8080'; node services/gateway/scripts/smoke_test.js

// Use global fetch if available (Node 18+), otherwise dynamically import node-fetch
const fetch = globalThis.fetch || ((...args) => import('node-fetch').then(({ default: f }) => f(...args)));
const nodeCrypto = (() => {
  try {
    // prefer Node's crypto (has createHmac & randomUUID)
    return require('crypto');
  } catch (e) {
    return globalThis.crypto;
  }
})();

function cryptoRandom() {
  if (nodeCrypto && typeof nodeCrypto.randomUUID === 'function') return nodeCrypto.randomUUID();
  // fallback simple uuid v4-ish
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
const base = process.env.GATEWAY_URL || 'http://localhost:8080';

async function run(){
  console.log('Gateway smoke test against', base);
  try{
    const q = await fetch(`${base}/v1/jobs/quote`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({plan:[{est_units:1000}]}) });
    const quote = await q.json();
    console.log('quote:', quote);

    // generate a dev-style DPoP header (header.payload.signature)
    const makeDpop = (method, url) => {
      const header = { alg: 'ES256', typ: 'dpop+jwt', jwk: { kty: 'EC', x: 'dev-x', y: 'dev-y', crv: 'P-256' } };
      const payload = { jti: cryptoRandom(), htm: method, htu: url, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 300 };
      const h = Buffer.from(JSON.stringify(header)).toString('base64');
      const p = Buffer.from(JSON.stringify(payload)).toString('base64');
      const sig = 'dev-signature';
      return `${h}.${p}.${sig}`;
    };

    const lockUrl = `${base}/v1/jobs/lock`;
    const dpop = makeDpop('POST', lockUrl);

    // generate a dev HS256-style usage token to satisfy authVerify which accepts signed usage tokens in dev
    const base64Url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    // prefer using jsonwebtoken when available in the environment
    let signUsage;
    try {
      const jwt = require('jsonwebtoken');
      signUsage = (payload, secret) => jwt.sign(payload, secret, { algorithm: 'HS256' });
    } catch (e) {
      signUsage = (payload, secret) => {
        const header = { alg: 'HS256', typ: 'JWT' };
        const h = base64Url(JSON.stringify(header));
        const p = base64Url(JSON.stringify(payload));
        const toSign = `${h}.${p}`;
        const sig = nodeCrypto.createHmac('sha256', secret).update(toSign).digest();
        const s = base64Url(sig);
        return `${toSign}.${s}`;
      };
    }

    const gatewaySecret = process.env.GATEWAY_SECRET || 'dev-gateway-secret-change-me';
    const usagePayload = { job_id: 'smoke', locked_budget_apic: 100, endpoints: ['openai/gpt-4'], exp: Date.now() + 3600000 };
    const usageToken = signUsage(usagePayload, gatewaySecret);

    const lockRes = await fetch(lockUrl, { method: 'POST', headers: {'Content-Type':'application/json', 'DPoP': dpop, 'Usage-Auth': usageToken}, body: JSON.stringify({job_id:'smoke', budget_apic: 100, endpoints:['openai/gpt-4']}) });
    const lock = await lockRes.json();
    console.log('lock:', lock);

    const usage = lock.usage_auth_token;
    if(!usage){
      console.error('No usage token returned');
      process.exit(2);
    }

    const exec = await fetch(`${base}/v1/execute`, { method: 'POST', headers: {'Content-Type':'application/json','Usage-Auth': usage}, body: JSON.stringify({endpoint:'openai/gpt-4', method:'POST', body:{prompt:'hello'}}) });
    const exe = await exec.json();
    console.log('execute:', exe);

    console.log('smoke test finished');
  }catch(e){
    console.error('smoke test failed', e);
    process.exit(1);
  }
}

run();
