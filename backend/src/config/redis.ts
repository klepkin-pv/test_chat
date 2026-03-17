import { createClient } from 'redis';
import { getDefaultRedisUrl } from './app.js';
import { logger } from '../utils/logger.js';

export const redisClient = createClient({
  url: process.env.REDIS_URL || getDefaultRedisUrl()
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    logger.info('Redis connected successfully');
  } catch (error) {
    logger.error('Redis connection error', error);
    throw error;
  }
};
