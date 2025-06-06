import Redis from 'ioredis';

// Validate required Redis configuration
if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
  throw new Error('REDIS_URL or REDIS_HOST environment variable is required');
}

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

// Create Redis client
export const redis = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })
  : new Redis(redisConfig);

// Handle Redis connection events
redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redis.on('close', () => {
  console.log('Redis connection closed');
});

export default redis;