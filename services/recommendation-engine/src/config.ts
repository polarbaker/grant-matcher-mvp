import dotenv from 'dotenv';

dotenv.config();

export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4'
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    recommendationTTL: 3600 // 1 hour in seconds
  },
  server: {
    port: process.env.PORT || 3000
  }
};
