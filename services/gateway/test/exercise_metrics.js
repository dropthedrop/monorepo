const http = require('http');

function post(path, body){
  const data = JSON.stringify(body);
  return new Promise((resolve, reject)=>{
    const options = { hostname: '127.0.0.1', port: 8080, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };
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
  for (let i=0;i<8;i++){
    try{
      const r = await post('/v1/usage/emit', { id:`ux-${i}`, payload:{ n:i } });
      console.log('posted', i, r.status);
    }catch(e){
      console.error('err', e.message);
    }
  }
})();
