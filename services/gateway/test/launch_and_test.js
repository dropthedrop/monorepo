const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

function waitForPort(host, port, timeout = 5000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function tryConnect(){
      const req = http.request({ host, port, method: 'GET', path: '/' }, (res)=>{
        resolve();
      });
      req.on('error', (e)=>{
        if (Date.now() - start > timeout) return reject(new Error('timeout'));
        setTimeout(tryConnect, 200);
      });
      req.end();
    })();
  });
}

function post(pathname, body){
  const data = JSON.stringify(body);
  return new Promise((resolve, reject)=>{
    const options = { hostname: '127.0.0.1', port: 8080, path: pathname, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };
    const req = http.request(options, (res)=>{
      let bufs = [];
      res.on('data', (c)=> bufs.push(c));
      res.on('end', ()=>{
        resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(bufs).toString() });
      });
    });
    req.on('error', (e)=> reject(e));
    req.write(data);
    req.end();
  });
}

(async ()=>{
  const cwd = path.resolve(__dirname, '..');
  console.log('Starting server in', cwd);
  const child = spawn('npx', ['ts-node', 'src/index.ts'], { cwd, shell: true });
  child.stdout.on('data', (d)=> process.stdout.write(d));
  child.stderr.on('data', (d)=> process.stderr.write(d));

  try{
    await waitForPort('127.0.0.1', 8080, 8000);
    console.log('Port open, running tests');
    const q = await post('/v1/jobs/quote', { plan:[{ endpoint_id:'llm.chat.v1', est_units:12000 }], tenant_id:'0x01' });
    console.log('quote', q);
    const l = await post('/v1/jobs/lock', { job_id:'job-demo-12345', estimated_credits:600 });
    console.log('lock', { status: l.status, headers: l.headers });
    const e = await post('/v1/execute', { job_id:'job-demo-12345', tool:'llm.chat.v1', args:{ messages:[{ role:'user', content:'Hi' }] }, budget:600 });
    console.log('exec', e);
  }catch(e){
    console.error('test error', e);
  }finally{
    console.log('killing server');
    child.kill();
  }
})();
