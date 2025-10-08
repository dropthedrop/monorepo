const Fastify = require('fastify');

async function main(){
  const server = Fastify();
  server.get('/tariff', async (req, reply) => {
    return { version: 'v1', rates: [{ endpoint: 'llm.chat.v1', unitsPerCall: 12000, creditsPerUnit: 0.00004 }], hash: '0xdeadbeef' };
  });
  await server.listen({ port: 9090, host: '0.0.0.0' });
}

main().catch(console.error);
