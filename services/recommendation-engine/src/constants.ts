export const ERROR_MESSAGES = {
  INTERNAL_SERVER_ERROR: 'Internal server error',
  GRANT_NOT_FOUND: 'Grant not found',
  INVALID_FILE_TYPE: 'Invalid file type. Only PDF and PPTX files are supported',
  FILE_TOO_LARGE: 'File size exceeds the maximum limit',
  LLM_ANALYSIS_FAILED: 'Failed to analyze deck content using LLM',
  GRANT_MATCHING_FAILED: 'Failed to match grants using LLM',
  INVALID_FEEDBACK: 'Invalid feedback format',
  CACHE_ERROR: 'Cache operation failed',
  UNAUTHORIZED: 'Unauthorized access',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded'
};

export const FILE_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
};

export const CACHE_KEYS = {
  DECK_ANALYSIS: 'deck:analysis:',
  GRANT_RECOMMENDATIONS: 'grant:recommendations:',
  GRANT_DETAILS: 'grant:details:'
};

export const LLM_CONFIG = {
  MAX_TOKENS: 1000,
  TEMPERATURE: 0.3,
  MODEL: 'gpt-4'
};
