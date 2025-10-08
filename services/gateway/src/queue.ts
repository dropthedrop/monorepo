import Redis from 'ioredis';

// Small Redis-backed queue with in-memory fallback
export class Queue<T> {
  private redis?: Redis;
  private key: string;
  private fallback: Array<T> = [];

  constructor(key = 'gateway:queue', redisUrl?: string) {
    this.key = key;
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl);
      } catch (e) {
        this.redis = undefined;
      }
    }
  }

  async push(item: T) {
    if (this.redis) {
      try {
        await this.redis.rpush(this.key, JSON.stringify(item));
        return;
      } catch (e) {
        // fallthrough to fallback
      }
    }
    this.fallback.push(item);
  }

  async pop(): Promise<T | undefined> {
    if (this.redis) {
      try {
        const v = await this.redis.lpop(this.key);
        if (!v) return undefined;
        return JSON.parse(v) as T;
      } catch (e) {
        // fallthrough
      }
    }
    return this.fallback.shift();
  }

  async size(): Promise<number> {
    if (this.redis) {
      try {
        const s = await this.redis.llen(this.key);
        return s;
      } catch (e) {
        // fallthrough
      }
    }
    return this.fallback.length;
  }
}
