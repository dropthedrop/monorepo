const Fastify = require('fastify');

async function main(){
  const server = Fastify();
  server.post('/invoice', async (req, reply) => {
    const body = req.body || {};
    return { invoice: { job: body.job || 'unknown', amount: 100, currency: 'CRED', tx: null } };
  });
  await server.listen({ port: 9091, host: '0.0.0.0' });
}

main().catch(console.error);
