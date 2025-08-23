const http = require('http');

function post(path, body){
  const data = JSON.stringify(body);
  return new Promise((resolve, reject)=>{
  const options = { hostname: '127.0.0.1', port: 8080, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), 'DPoP': 'dev-dpop', 'Usage-Auth': 'TEST-USE' } };
    const req = http.request(options, (res)=>{
      let bufs = [];
      res.on('data', (c)=> bufs.push(c));
      res.on('end', ()=>{
        const body = Buffer.concat(bufs).toString();
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', (e)=> reject(e));
    req.write(data);
    req.end();
  });
}

(async ()=>{
  try{
    const q = await post('/v1/jobs/quote', { plan:[{ endpoint_id:'llm.chat.v1', est_units:12000 }], tenant_id:'0x01' });
    console.log('quote', q);

    const l = await post('/v1/jobs/lock', { job_id:'job-demo-12345', estimated_credits:600 });
    console.log('lock', { status: l.status, headers: l.headers });

    const e = await post('/v1/execute', { job_id:'job-demo-12345', tool:'llm.chat.v1', args:{ messages:[{ role:'user', content:'Hi' }] }, budget:600 });
    console.log('exec', e);
  }catch(e){
    console.error('error', e);
    process.exit(1);
  }
})();
