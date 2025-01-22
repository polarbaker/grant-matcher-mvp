import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { REDIS_URL } from '../constants';

class CacheService {
  private redis: Redis;
  private DEFAULT_EXPIRATION = 3600; // 1 hour

  constructor() {
    this.redis = new Redis(REDIS_URL);

    this.redis.on('error', (error) => {
      logger.error('Redis Error:', error);
    });

    this.redis.on('connect', () => {
      logger.info('Connected to Redis');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, expiration = this.DEFAULT_EXPIRATION): Promise<void> {
    try {
      await this.redis.setex(key, expiration, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  async flush(): Promise<void> {
    try {
      await this.redis.flushall();
    } catch (error) {
      logger.error('Cache flush error:', error);
    }
  }
}

export const cacheService = new CacheService();
