const Fastify = require('fastify');

async function main(){
  const server = Fastify();
  server.post('/aggregate', async (req, reply) => {
    // expect events, compute dummy merkle root and return
    const body = req.body || {};
    const root = '0x' + Buffer.from(JSON.stringify(body)).toString('hex').slice(0,64);
    return { merkleRoot: root };
  });
  await server.listen({ port: 9100, host: '0.0.0.0' });
}

main().catch(console.error);
