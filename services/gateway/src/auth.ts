import { FastifyRequest } from 'fastify';
import cbor from 'cbor';
import { ethers } from 'ethers';
import Redis from 'ioredis';

// Simple Map-based TTL cache to avoid external package export shape issues.
class SimpleTTLCache<T> {
  private map: Map<string, { value: T; expiresAt: number }> = new Map();
  private ttl: number;
  private max: number;
  constructor(options: { ttl: number; max?: number }) {
    this.ttl = options.ttl;
    this.max = options.max || 1000;
  }
  get(key: string): T | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (Date.now() > e.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return e.value;
  }
  set(key: string, value: T) {
    if (this.map.size >= this.max) {
      // simple eviction: remove first inserted key
      const firstKey = this.map.keys().next().value;
      if (firstKey) this.map.delete(firstKey);
    }
    this.map.set(key, { value, expiresAt: Date.now() + this.ttl });
  }
}

const cache = new SimpleTTLCache<boolean>({ ttl: 5000, max: 1000 });

export async function verifyUsageToken(req: FastifyRequest, tokenB64: string): Promise<boolean> {
  // check cache
  if (cache.get(tokenB64)) return true;
  console.debug('[auth] verifyUsageToken called');
  try {
    // Try CBOR-encoded token first (production flow)
    try {
      const buf = Buffer.from(tokenB64, 'base64');
      const decoded = cbor.decodeAllSync(buf)[0];
      // expected shape: { payload: {...}, sig: '0x..', signer: '0x..' }
      const payload = decoded.payload || {};
      const sig = decoded.sig;
      const signer = decoded.signer;
      if (sig && signer) {
        const msg = JSON.stringify(payload);
        const recovered = ethers.utils.verifyMessage(msg, sig);
        if (recovered && recovered.toLowerCase() === signer.toLowerCase()) {
          cache.set(tokenB64, true);
          return true;
        }
      }
    } catch (e) {
      // Not CBOR / not signed; fall back to base64-JSON dev token
      console.debug('[auth] CBOR decode failed, will try base64 JSON fallback');
    }

    // Fallback: treat token as base64-encoded JSON (development flow)
    try {
      const raw = Buffer.from(tokenB64, 'base64').toString('utf8');
      const parsed = JSON.parse(raw);
      // minimal checks: job_id and expires_at
      if (parsed && parsed.job_id && parsed.expires_at) {
        // optional expiry enforcement
        if (new Date(parsed.expires_at).getTime() < Date.now()) return false;
        cache.set(tokenB64, true);
        return true;
      }
    } catch (e) {
      // not base64 JSON either
      console.debug('[auth] base64 JSON parse failed for usage token');
    }
  } catch (e) {
    console.debug('[auth] verifyUsageToken outer error', e);
    // invalid token
  }
  return false;
}

// Redis helper for DPoP jti replay protection (if REDIS_URL provided)
const redisUrl = process.env.REDIS_URL || undefined;
let redisClient: Redis | undefined;
if (redisUrl) {
  try {
    redisClient = new Redis(redisUrl);
  } catch (e) {
    redisClient = undefined;
  }
}

export async function verifyDpopHeader(req: FastifyRequest, dpopHeader: string): Promise<boolean> {
  // Accept either a base64-encoded JSON string, or a simple JWT-like dev token.
  // Dev token shape: base64(header).base64(payload).signature
  if (!dpopHeader || typeof dpopHeader !== 'string') return false;

  // Parse payload
  let parsed: any = null;
  try {
    if ((dpopHeader.match(/\./g) || []).length === 2) {
      const parts = dpopHeader.split('.');
      const payloadRaw = Buffer.from(parts[1], 'base64').toString('utf8');
      parsed = JSON.parse(payloadRaw);
      parsed.sig = parsed.sig || parts[2] || undefined;
    } else {
      const raw = Buffer.from(dpopHeader, 'base64').toString('utf8');
      parsed = JSON.parse(raw);
    }
  } catch (e) {
    console.debug('[auth] DPoP parse failed', e);
    return false; // malformed
  }

  const { htm, htu, iat, sig, signer, jti } = parsed as { htm?: string; htu?: string; iat?: number; sig?: string; signer?: string; jti?: string };
  if (!htm || !htu || !iat) return false;

  // basic time skew check (allow 60s skew)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(iat)) > 60) return false;

  // method/URL binding
  const reqMethod = (req.method || '').toString().toUpperCase();
  const reqUrl = (req.routerPath || req.url || '').toString();
  if (htm.toUpperCase() !== reqMethod) return false;
  if (!htu.endsWith(reqUrl)) return false;

  // Production: require signer+sig and verify signature; Development: allow placeholder tokens
  if (signer && sig) {
    const msg = `${htm}:${htu}:${iat}`;
    try {
      const recovered = ethers.utils.verifyMessage(msg, sig as string);
      if (recovered && recovered.toLowerCase() === signer.toLowerCase()) {
        // optional jti replay protection
        try {
          if (jti && redisClient) {
            const key = `dpop_jti:${jti}`;
            const set = await redisClient.set(key, '1', 'PX', 120000, 'NX');
            if (!set) return false;
          }
        } catch (e) {
          // ignore redis errors
        }
        return true;
      }
    } catch (e) {
      console.debug('[auth] DPoP signature verification failed', e);
      // signature verification failed
      return false;
    }
  }

  // If no signer/sig, allow in development with optional jti check
  if (process.env.NODE_ENV !== 'production') {
    try {
      if (jti && redisClient) {
        const key = `dpop_jti:${jti}`;
        const set = await redisClient.set(key, '1', 'PX', 120000, 'NX');
        if (!set) return false;
      }
    } catch (e) {
      // ignore redis errors in dev
    }
    console.debug('[auth] allowing DPoP-less dev token (NODE_ENV!=production)');
    return true;
  }

  return false;
}
