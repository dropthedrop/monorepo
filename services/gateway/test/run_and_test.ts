import { startServer } from '../src/index';
import fetch from 'node-fetch';

async function run() {
  const server = await startServer();
  try {
    const q = await fetch('http://127.0.0.1:8080/v1/jobs/quote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plan: [{ endpoint_id: 'llm.chat.v1', est_units: 12000 }], tenant_id: '0x01' }) });
    console.log('quote status', q.status);
    console.log('quote body', await q.text());

    const l = await fetch('http://127.0.0.1:8080/v1/jobs/lock', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ job_id: 'job-demo-12345', estimated_credits: 600 }) });
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
