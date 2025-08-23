const fetch = require('node-fetch');

async function run(){
  try{
    const quote = await fetch('http://localhost:8080/v1/jobs/quote', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({plan:[{endpoint_id:'llm.chat.v1', est_units:12000}], tenant_id:'0x01'})});
    console.log('quote status', quote.status);
    console.log('quote body', await quote.text());

    const lock = await fetch('http://localhost:8080/v1/jobs/lock', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({job_id:'job-demo-12345', estimated_credits:600})});
    console.log('lock status', lock.status);
    console.log('lock headers', Object.fromEntries(lock.headers.entries()));

    const exec = await fetch('http://localhost:8080/v1/execute', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({job_id:'job-demo-12345', tool:'llm.chat.v1', args:{messages:[{role:'user', content:'Hi'}]}, budget:600})});
    console.log('exec status', exec.status);
    console.log('exec body', await exec.text());
  }catch(e){
    console.error('smoke error', e);
    process.exit(1);
  }
}

run();
