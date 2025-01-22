export const DEFAULT_PORT = 4002;
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/grant-matcher';
export const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
};

export const RECOMMENDATION = {
  MAX_RESULTS: 10,
  MIN_MATCH_SCORE: 0.5,
  CACHE_EXPIRATION: 3600, // 1 hour
  CACHE_KEYS: {
    RECOMMENDATIONS: 'recommendations:',
    GRANT: 'grant:',
    ANALYSIS: 'analysis:'
  }
};

export const ERROR_MESSAGES = {
  NO_FILE_UPLOADED: 'No file uploaded',
  INVALID_FILE_TYPE: 'Only PDF and PPTX files are allowed',
  DECK_ANALYSIS_REQUIRED: 'Deck analysis is required',
  GRANT_NOT_FOUND: 'Grant not found',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  RATE_LIMIT_EXCEEDED: 'Too many requests from this IP, please try again later'
};

export const CORS_OPTIONS = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};
