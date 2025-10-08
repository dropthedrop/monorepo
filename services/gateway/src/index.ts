import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import client from 'prom-client';
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { Queue } from './queue';
import { verifyDpopHeader } from './auth';

// Simple in-memory auth/queue stubs for the next development slice
const authVerifyMs = new client.Histogram({ name: 'auth_verify_ms', help: 'auth verification latency ms', buckets: [1,5,10,20,50,100] });
const receiptLagMs = new client.Histogram({ name: 'receipt_lag_ms', help: 'receipt processing lag ms', buckets: [1,10,50,100,500,1000] });
const queueDepth = new client.Gauge({ name: 'queue_depth', help: 'in-memory queue depth' });

// Redis-backed queue with Map fallback
const redisUrl = process.env.REDIS_URL || undefined;
const receiptQueue = new Queue<{ id: string; enqueuedAt: number; payload: any }>('gateway:receipt', redisUrl);
let processing = false;

async function processQueue() {
  if (processing) return;
  processing = true;
  try {
    while (true) {
      const size = await receiptQueue.size();
      if ((size || 0) <= 0) break;
      queueDepth.set(size || 0);
      const item = await receiptQueue.pop();
      if (!item) break;
      // simulate processing delay
      await new Promise((r) => setTimeout(r, 50));
      const lag = Date.now() - item.enqueuedAt;
      receiptLagMs.observe(lag);
    }
  } finally {
    queueDepth.set(0);
    processing = false;
  }
}

// Use a standard JWT library for signing/verifying HS256 tokens in dev.
const GATEWAY_SECRET = process.env.GATEWAY_SECRET || 'dev-gateway-secret-change-me';

function signUsageToken(payload: Record<string, any>) {
  // jwt.sign will set exp if provided in payload as seconds or we can pass expiresIn
  // normalize: allow payload.exp as ms since epoch -> convert to seconds if present
  const opts: any = { algorithm: 'HS256' };
  let p = { ...payload };
  if (p.exp && p.exp > 9999999999) {
    // probably ms -> convert to seconds
    p.exp = Math.floor(p.exp / 1000);
  }
  return jwt.sign(p, GATEWAY_SECRET, opts);
}

function verifyUsageToken(token: string): { ok: boolean; payload?: any } {
  try {
    const decoded = jwt.verify(token, GATEWAY_SECRET) as any;
    return { ok: true, payload: decoded };
  } catch (e) {
    return { ok: false };
  }
}

async function authVerify(req: FastifyRequest): Promise<boolean> {
  const start = Date.now();
  try {
    const dpop = (req.headers as any)['dpop'];
    const usage = (req.headers as any)['usage-auth'] || (req.headers as any)['usage_auth'] || (req.headers as any)['usage-auth-token'];

    if (typeof usage === 'string') {
      const res = verifyUsageToken(usage);
      // In dev we allow valid usage tokens to be sufficient. In production
      // you should require DPoP and verify client keys.
      if (res.ok) return true;
    }

    // Fallback: if DPoP is present and verifyDpopHeader returns true, allow it
    if (dpop && typeof dpop === 'string') {
      try {
        const ok = await verifyDpopHeader(req as FastifyRequest, String(dpop));
        return !!ok;
      } catch (e) {
        return false;
      }
    }

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
    // Debug: log incoming headers and body to diagnose dev auth flows
    try {
      server.log.debug({ headers: req.headers, body: req.body }, 'incoming lock request headers/body');
    } catch (e) {
      // ignore
    }
    // Diagnostic checks: run usage-token verification and dpop verification separately to log results
    const headersAny: any = req.headers as any;
    let usageHeader = headersAny['usage-auth'] || headersAny['usage_auth'] || headersAny['usage-auth-token'] || headersAny['usage-auth-token'] || headersAny['usageauth'] || headersAny['usage'];
    let dpopHeader = headersAny['dpop'] || headersAny['DPoP'] || headersAny['DPOP'];

    let usageOk = false;
    let dpopOk = false;
    try {
      if (typeof usageHeader === 'string') {
        const r = verifyUsageToken(String(usageHeader));
        usageOk = !!(r && r.ok);
        // Avoid logging full token payloads in any environment; only lightly log in dev
        if (process.env.NODE_ENV !== 'production') {
          server.log.debug({ usageOk, usage_job_id: r && r.payload ? r.payload.job_id : undefined }, 'usage token diagnostic');
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') server.log.debug({ err: String(e) }, 'usage token diagnostic error');
    }

    try {
      if (typeof dpopHeader === 'string') {
        dpopOk = !!(await verifyDpopHeader(req as FastifyRequest, String(dpopHeader)));
        if (process.env.NODE_ENV !== 'production') server.log.debug({ dpopOk }, 'dpop diagnostic');
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') server.log.debug({ err: String(e) }, 'dpop diagnostic error');
    }

    const ok = await authVerify(req as FastifyRequest);
    if (!ok) {
      // Provide minimal info in logs; only debug-rich in development
      if (process.env.NODE_ENV !== 'production') {
        server.log.debug({ ok, usageOk, dpopOk }, 'auth verification failed summary');
      } else {
        server.log.info('auth verification failed for /v1/jobs/lock');
      }
      return reply.status(401).send({ error: 'missing or invalid auth' });
    }
    const body: any = req.body as any;
    const jobId = body.job_id || `job-${Math.random().toString(36).slice(2,9)}`;
    reply.header('X-Lock-Handle', `lock-${jobId}`);
    // Provide a development usage auth token to the client so frontend can call /v1/execute
    const expiresMs = Date.now() + 3600000; // 1 hour
    const usageAuthPayload = {
      job_id: jobId,
      locked_budget_apic: body.budget_apic || 0,
      endpoints: body.endpoints || [],
      exp: expiresMs, // expire in 1 hour (ms)
    };
    const usageAuthToken = signUsageToken(usageAuthPayload);
    const expiresIso = new Date(expiresMs).toISOString();
    return reply.status(200).send({ job_id: jobId, locked_budget_apic: usageAuthPayload.locked_budget_apic, usage_auth_token: usageAuthToken, expires_at: expiresIso });
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
  await receiptQueue.push({ id, enqueuedAt: Date.now(), payload: body });
  const s = await receiptQueue.size();
  queueDepth.set(s);
    // kick the processor but don't await
    processQueue().catch(() => {});
    return { ok: true, id };
  });

  server.post('/v1/oracle/receipt', async (req, reply) => {
    gatewayRps.inc();
    const body: any = req.body as any;
    const id = body.id || `rc-${Math.random().toString(36).slice(2,9)}`;
  await receiptQueue.push({ id, enqueuedAt: Date.now(), payload: body });
  const s2 = await receiptQueue.size();
  queueDepth.set(s2);
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
    await server.listen({ port, host: '0.0.0.0' });
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
