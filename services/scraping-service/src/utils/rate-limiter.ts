interface RateLimiterOptions {
  maxRequests: number;
  timeWindow: number;
}

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;

  constructor(options: RateLimiterOptions) {
    this.maxTokens = options.maxRequests;
    this.tokens = options.maxRequests;
    this.lastRefill = Date.now();
    this.refillRate = options.maxRequests / (options.timeWindow / 1000); // tokens per second
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // convert to seconds
    const newTokens = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }

  public async waitForToken(): Promise<void> {
    this.refillTokens();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return Promise.resolve();
    }

    const waitTime = (1 - this.tokens) / this.refillRate * 1000; // convert to milliseconds
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    this.refillTokens();
    this.tokens -= 1;
  }
}
