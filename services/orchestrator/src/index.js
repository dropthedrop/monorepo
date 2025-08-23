const Fastify = require('fastify');

const server = Fastify({ logger: true });

server.get('/health', async (req, reply) => {
  return { ok: true, service: 'orchestrator' };
});

const port = process.env.PORT || 9080;
server.listen({ port: Number(port), host: '0.0.0.0' }).then(()=>{
  server.log.info('orchestrator listening on ' + port);
}).catch((err)=>{
  console.error(err);
  process.exit(1);
});
