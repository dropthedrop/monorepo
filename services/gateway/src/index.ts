import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import client from 'prom-client';
import fs from 'fs';
import path from 'path';

// Simple in-memory auth/queue stubs for the next development slice
const authVerifyMs = new client.Histogram({ name: 'auth_verify_ms', help: 'auth verification latency ms', buckets: [1,5,10,20,50,100] });
const receiptLagMs = new client.Histogram({ name: 'receipt_lag_ms', help: 'receipt processing lag ms', buckets: [1,10,50,100,500,1000] });
const queueDepth = new client.Gauge({ name: 'queue_depth', help: 'in-memory queue depth' });

// simple in-memory FIFO queue to simulate receipt processing and lag
const receiptQueue: Array<{ id: string; enqueuedAt: number; payload: any }> = [];
let processing = false;

async function processQueue() {
  if (processing) return;
  processing = true;
  while (receiptQueue.length > 0) {
    queueDepth.set(receiptQueue.length);
    const item = receiptQueue.shift()!;
    // simulate processing delay
    await new Promise((r) => setTimeout(r, 50));
    const lag = Date.now() - item.enqueuedAt;
    receiptLagMs.observe(lag);
  }
  queueDepth.set(0);
  processing = false;
}

async function authVerify(req: FastifyRequest): Promise<boolean> {
  const start = Date.now();
  try {
    // Minimal stub: require headers 'dpop' and 'usage-auth'
    const dpop = (req.headers as any)['dpop'];
    const usage = (req.headers as any)['usage-auth'];
    if (!dpop || !usage) {
      return false;
    }
    // Accept a deterministic test token for now: 'TEST-USE'
    if (typeof usage === 'string' && usage === 'TEST-USE') {
      return true;
    }
    // Incomplete: real implementation must parse CWT/CBOR and verify EIP-712 capability
    return false;
  } finally {
    authVerifyMs.observe(Date.now() - start);
  }
}

export function buildServer(): FastifyInstance {
  const server = Fastify({ logger: true });
  // Basic Prometheus metrics
  const register = client.register;
  const gatewayRps = new client.Counter({ name: 'gateway_rps', help: 'gateway requests' });

  server.register(cors, { origin: true });

  server.post('/v1/jobs/quote', async (req, reply) => {
    gatewayRps.inc();
    const body: any = req.body as any;
    const est = (body.plan || []).reduce((s: number, p: any) => s + (p.est_units || 0), 0);
    const estimated_credits = Math.ceil(est * 0.00004);
    return { estimated_credits, tariff_hash: '0xdeadbeef', expires_ms: Date.now() + 60_000 };
  });

  server.post('/v1/jobs/lock', async (req, reply) => {
    gatewayRps.inc();
    const ok = await authVerify(req as FastifyRequest);
    if (!ok) {
      return reply.status(401).send({ error: 'missing or invalid auth' });
    }
    const body: any = req.body as any;
    reply.header('X-Lock-Handle', `lock-${body.job_id || 'unknown'}`);
    return reply.status(204).send();
  });

  server.post('/v1/execute', async (req, reply) => {
    gatewayRps.inc();
    const usage = { units: 11840, credits: 474 };
    return { ok: true, usage };
  });

  server.post('/v1/usage/emit', async (req, reply) => {
    gatewayRps.inc();
    const body: any = req.body as any;
    const id = body.id || `rx-${Math.random().toString(36).slice(2,9)}`;
    receiptQueue.push({ id, enqueuedAt: Date.now(), payload: body });
    queueDepth.set(receiptQueue.length);
    // kick the processor but don't await
    processQueue().catch(() => {});
    return { ok: true, id };
  });

  server.post('/v1/oracle/receipt', async (req, reply) => {
    gatewayRps.inc();
    const body: any = req.body as any;
    const id = body.id || `rc-${Math.random().toString(36).slice(2,9)}`;
    receiptQueue.push({ id, enqueuedAt: Date.now(), payload: body });
    queueDepth.set(receiptQueue.length);
    processQueue().catch(() => {});
    return { ok: true, id };
  });

  server.get('/metrics', async (req, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });

  return server;
}

export async function startServer() {
  const server = buildServer();
  const port = Number(process.env.PORT || 8080);
  try {
    await server.listen({ port, host: '127.0.0.1' });
    // write a small file to indicate the server is up (useful for tests)
    try {
      const marker = path.join(__dirname, '..', 'server.started');
      fs.writeFileSync(marker, `listening ${port}\n`);
    } catch (e) {
      // ignore
    }
    return server;
  } catch (err) {
    server.log.error(err);
    throw err;
  }
}

// If run directly, start server
(async () => {
  if (require.main === module) {
    try {
      await startServer();
    } catch (e) {
      process.exit(1);
    }
  }
})();
