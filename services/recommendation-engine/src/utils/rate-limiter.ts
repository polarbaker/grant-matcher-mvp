import { Redis } from 'ioredis';
import { config } from '../config';
import { createLogger } from './logger';

const logger = createLogger('rate-limiter');

export class RateLimiter {
  private readonly redis: Redis;
  private readonly windowSizeInSeconds: number;
  private readonly maxRequests: number;

  constructor() {
    this.redis = new Redis(config.redis.url);
    this.windowSizeInSeconds = 60; // 1 minute window
    this.maxRequests = 100; // 100 requests per minute
  }

  async isRateLimited(key: string): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - (this.windowSizeInSeconds * 1000);

    try {
      // Add the current request timestamp
      await this.redis.zadd(key, now.toString(), now.toString());

      // Remove old entries outside the window
      await this.redis.zremrangebyscore(key, '-inf', windowStart.toString());

      // Count requests in the current window
      const requestCount = await this.redis.zcard(key);

      // Set expiry on the key
      await this.redis.expire(key, this.windowSizeInSeconds);

      return requestCount > this.maxRequests;
    } catch (error) {
      logger.error('Error checking rate limit:', error);
      return false; // Fail open if Redis is unavailable
    }
  }

  async cleanup(): Promise<void> {
    await this.redis.quit();
  }
}
