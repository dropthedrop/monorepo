export async function quote(gateway: string, plan: any) {
  const res = await fetch(`${gateway}/v1/jobs/quote`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plan }) });
  return res.json();
}

export async function lock(gateway: string, job: any, usageAuth: string, dpop: string) {
  const res = await fetch(`${gateway}/v1/jobs/lock`, { method: 'POST', headers: { 'content-type': 'application/json', 'usage-auth': usageAuth, 'dpop': dpop }, body: JSON.stringify(job) });
  return res;
}
