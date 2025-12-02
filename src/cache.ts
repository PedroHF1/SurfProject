import { Redis } from 'ioredis';
import config, { IConfig } from 'config';
import logger from './logger';

class CacheClient {
  private client: Redis | null = null;

  public async connect(): Promise<void> {
    if (this.client) {
      logger.info('Redis client already connected');
      return;
    }

    const cacheConfig: IConfig = config.get('App.cache');
    const redisUrl: string = (process.env.REDIS_URL as string) || (cacheConfig.get('redisUrl') as string);
    
    try {
      this.client = new Redis(redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        username: process.env.REDIS_USERNAME || cacheConfig.get('redisUsername') as string,
        password: process.env.REDIS_PASSWORD || cacheConfig.get('redisPassword') as string,
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected successfully');
      });

      this.client.on('error', (err) => {
        logger.error(`Redis client error: ${err.message}`);
      });

      this.client.on('reconnecting', (time: number) => {
        logger.warn(`Redis reconnecting in ${time}ms`);
      });

      this.client.on('close', () => {
        logger.info('Redis client connection closed');
      });

    } catch (error) {
      logger.error(`Failed to connect to Redis: ${error}`);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      logger.info('Redis client disconnected');
    }
  }

  public async get(key: string): Promise<string | null> {
    if (!this.client) {
      throw new Error('Redis client not connected');
    }
    return await this.client.get(key);
  }

  public async set(key: string, value: string, expirationSeconds?: number): Promise<void> {
    if (!this.client) {
      throw new Error('Redis client not connected');
    }
    if (expirationSeconds) {
      await this.client.setex(key, expirationSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  public async del(key: string): Promise<void> {
    if (!this.client) {
      throw new Error('Redis client not connected');
    }
    await this.client.del(key);
  }

  public getClient(): Redis | null {
    return this.client;
  }
}

export const cacheClient = new CacheClient();

