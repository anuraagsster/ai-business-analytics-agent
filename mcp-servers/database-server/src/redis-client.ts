import { createClient, RedisClientType } from 'redis';
import { CacheStats } from './types.js';

export class RedisClient {
  private client: RedisClientType;
  private defaultTTL: number;

  constructor(connectionString: string, defaultTTL: number = 3600) {
    this.client = createClient({
      url: connectionString
    });
    this.defaultTTL = defaultTTL;

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    const expiration = ttl || this.defaultTTL;
    
    await this.client.setEx(key, expiration, serializedValue);
  }

  async get(key: string): Promise<any | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error('Error parsing cached value:', error);
      return null;
    }
  }

  async delete(key: string): Promise<boolean> {
    const result = await this.client.del(key);
    return result > 0;
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async keys(pattern: string = '*'): Promise<string[]> {
    return await this.client.keys(pattern);
  }

  async flushAll(): Promise<void> {
    await this.client.flushAll();
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    const result = await this.client.expire(key, ttl);
    return result;
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  async getStats(): Promise<CacheStats> {
    const info = await this.client.info('memory');
    const keyspace = await this.client.info('keyspace');
    const stats = await this.client.info('stats');

    // Parse memory usage
    const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
    const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'Unknown';

    // Parse total keys
    const keysMatch = keyspace.match(/keys=(\d+)/);
    const totalKeys = keysMatch ? parseInt(keysMatch[1]) : 0;

    // Parse hit rate
    const hitsMatch = stats.match(/keyspace_hits:(\d+)/);
    const missesMatch = stats.match(/keyspace_misses:(\d+)/);
    const hits = hitsMatch ? parseInt(hitsMatch[1]) : 0;
    const misses = missesMatch ? parseInt(missesMatch[1]) : 0;
    const hitRate = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0;

    // Parse expired keys
    const expiredMatch = stats.match(/expired_keys:(\d+)/);
    const expiredKeys = expiredMatch ? parseInt(expiredMatch[1]) : 0;

    return {
      total_keys: totalKeys,
      memory_usage: memoryUsage,
      hit_rate: Math.round(hitRate * 100) / 100,
      expired_keys: expiredKeys
    };
  }

  async cleanupExpired(): Promise<number> {
    // Redis automatically handles expired key cleanup
    // This method returns the count of expired keys from stats
    const stats = await this.getStats();
    return stats.expired_keys;
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
}