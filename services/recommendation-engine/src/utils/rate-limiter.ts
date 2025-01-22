import { createLogger } from './logger';

const logger = createLogger('RateLimiter');

interface RateLimiterOptions {
  maxRequests: number;
  timeWindow: number;
  gracePeriod?: number;
}

/**
 * Implements a token bucket rate limiter with grace period and fair queuing
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private readonly timeWindow: number;
  private readonly gracePeriod: number;
  private readonly waitQueue: Array<{
    resolve: () => void;
    timestamp: number;
  }>;

  constructor(options: RateLimiterOptions) {
    this.maxTokens = options.maxRequests;
    this.tokens = options.maxRequests;
    this.lastRefill = Date.now();
    this.timeWindow = options.timeWindow;
    this.refillRate = options.maxRequests / (options.timeWindow / 1000); // tokens per second
    this.gracePeriod = options.gracePeriod || 1000; // default 1 second grace period
    this.waitQueue = [];

    // Start the queue processor
    this.processQueue();
  }

  /**
   * Refills tokens based on time elapsed
   */
  private refillTokens(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // convert to seconds
    const newTokens = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;

    logger.debug('Refilled tokens:', {
      newTokens,
      currentTokens: this.tokens,
      timePassed
    });
  }

  /**
   * Processes the wait queue and resolves promises when tokens are available
   */
  private async processQueue(): Promise<void> {
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Check queue every 100ms

      if (this.waitQueue.length === 0) {
        continue;
      }

      this.refillTokens();

      while (this.waitQueue.length > 0 && this.tokens >= 1) {
        const request = this.waitQueue[0];
        const now = Date.now();

        // Check if request has exceeded grace period
        if (now - request.timestamp > this.gracePeriod) {
          logger.warn('Request exceeded grace period, removing from queue');
          this.waitQueue.shift();
          continue;
        }

        this.tokens -= 1;
        request.resolve();
        this.waitQueue.shift();

        logger.debug('Processed queued request:', {
          queueLength: this.waitQueue.length,
          remainingTokens: this.tokens
        });
      }
    }
  }

  /**
   * Returns current rate limiter metrics
   */
  public getMetrics(): {
    availableTokens: number;
    queueLength: number;
    refillRate: number;
  } {
    return {
      availableTokens: this.tokens,
      queueLength: this.waitQueue.length,
      refillRate: this.refillRate
    };
  }

  /**
   * Waits for a token to become available
   */
  public async waitForToken(): Promise<void> {
    this.refillTokens();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      logger.debug('Token acquired immediately:', {
        remainingTokens: this.tokens
      });
      return;
    }

    // Calculate expected wait time
    const tokensNeeded = 1 - this.tokens;
    const expectedWaitTime = (tokensNeeded / this.refillRate) * 1000;

    if (expectedWaitTime > this.gracePeriod) {
      throw new Error(`Rate limit exceeded. Expected wait time: ${expectedWaitTime}ms`);
    }

    // Add to wait queue
    return new Promise((resolve, reject) => {
      const request = {
        resolve,
        timestamp: Date.now()
      };

      this.waitQueue.push(request);

      logger.debug('Request added to queue:', {
        queueLength: this.waitQueue.length,
        expectedWaitTime
      });

      // Set timeout for grace period
      setTimeout(() => {
        const index = this.waitQueue.indexOf(request);
        if (index !== -1) {
          this.waitQueue.splice(index, 1);
          reject(new Error('Request timed out waiting for token'));
        }
      }, this.gracePeriod);
    });
  }

  /**
   * Checks if a token is currently available without waiting
   */
  public isTokenAvailable(): boolean {
    this.refillTokens();
    return this.tokens >= 1;
  }

  /**
   * Gets the estimated wait time for a new request
   */
  public getEstimatedWaitTime(): number {
    this.refillTokens();

    if (this.tokens >= 1) {
      return 0;
    }

    const tokensNeeded = 1 - this.tokens + this.waitQueue.length;
    return (tokensNeeded / this.refillRate) * 1000;
  }

  /**
   * Resets the rate limiter to its initial state
   */
  public reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    this.waitQueue.length = 0;
    logger.info('Rate limiter reset');
  }
}
