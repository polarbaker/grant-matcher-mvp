import { createLogger } from './logger';

const logger = createLogger('RetryUtil');

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  exponential?: boolean;
  onRetry?: (error: unknown, attempt: number) => void;
}

const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  exponential: true,
  onRetry: (error, attempt) => {
    logger.warn(`Retry attempt ${attempt}:`, error);
  }
};

/**
 * Calculates delay for next retry attempt using exponential backoff
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  if (!options.exponential) {
    return options.baseDelay;
  }

  const delay = Math.min(
    options.baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000,
    options.maxDelay
  );

  return delay;
}

/**
 * Retries an async operation with exponential backoff
 * @param operation Function to retry
 * @param options Retry configuration options
 * @returns Result of the operation
 * @throws Last error encountered if all retries fail
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const mergedOptions: Required<RetryOptions> = {
    ...defaultOptions,
    ...options
  };

  let lastError: unknown;
  let attempt = 1;

  while (attempt <= mergedOptions.maxRetries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === mergedOptions.maxRetries) {
        logger.error('All retry attempts failed:', {
          error,
          attempts: attempt,
          maxRetries: mergedOptions.maxRetries
        });
        throw error;
      }

      mergedOptions.onRetry(error, attempt);
      
      const delay = calculateDelay(attempt, mergedOptions);
      logger.info(`Waiting ${delay}ms before retry attempt ${attempt + 1}`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }

  throw lastError;
}

/**
 * Retries an operation with a custom condition
 * @param operation Function to retry
 * @param condition Function that determines if retry is needed
 * @param options Retry configuration options
 * @returns Result of the operation
 */
export async function retryWithCondition<T>(
  operation: () => Promise<T>,
  condition: (result: T) => boolean,
  options: RetryOptions = {}
): Promise<T> {
  const mergedOptions: Required<RetryOptions> = {
    ...defaultOptions,
    ...options
  };

  let attempt = 1;

  while (attempt <= mergedOptions.maxRetries) {
    const result = await operation();
    
    if (!condition(result)) {
      return result;
    }

    if (attempt === mergedOptions.maxRetries) {
      logger.warn('All retry attempts failed condition check:', {
        attempts: attempt,
        maxRetries: mergedOptions.maxRetries
      });
      return result;
    }

    mergedOptions.onRetry(
      new Error('Retry condition not met'),
      attempt
    );
    
    const delay = calculateDelay(attempt, mergedOptions);
    logger.info(`Waiting ${delay}ms before retry attempt ${attempt + 1}`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    attempt++;
  }

  throw new Error('Unexpected retry loop exit');
}

/**
 * Retries an operation with timeout
 * @param operation Function to retry
 * @param timeout Timeout in milliseconds
 * @param options Retry configuration options
 * @returns Result of the operation
 */
export async function retryWithTimeout<T>(
  operation: () => Promise<T>,
  timeout: number,
  options: RetryOptions = {}
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), timeout);
  });

  return Promise.race([
    retry(operation, options),
    timeoutPromise
  ]);
}

/**
 * Retries multiple operations in parallel
 * @param operations Array of functions to retry
 * @param options Retry configuration options
 * @returns Array of operation results
 */
export async function retryAll<T>(
  operations: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<T[]> {
  return Promise.all(
    operations.map(operation => retry(operation, options))
  );
}

/**
 * Creates a retryable version of a function
 * @param fn Function to make retryable
 * @param options Default retry options
 * @returns Retryable function
 */
export function makeRetryable<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    return retry(() => fn(...args), options);
  }) as T;
}
