import puppeteer, { Browser, Page } from 'puppeteer';
import { JSDOM } from 'jsdom';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Redis } from 'ioredis';
import { Logger } from 'winston';
import { Grant, GrantAmount, GrantSector } from '../types/grant.types';
import { GrantSource } from './grant-scraper.service';
import { createLogger } from '../utils/logger';
import { SortOptions, PaginationOptions, GrantFilters } from '../types/filter.types';
import { sanitizeHtml, extractAmount, parseDate } from '../utils/parser.utils';
import { RateLimiter } from '../utils/rate-limiter';
import config from '../config';

export class EnhancedScraper {
  private browser: Browser | null = null;
  private readonly redis: Redis;
  private readonly logger: Logger;
  private readonly rateLimiter: RateLimiter;
  private readonly userAgents: string[] = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    // Add more user agents for rotation
  ];

  constructor() {
    this.redis = new Redis(config.redis);
    this.logger = createLogger('EnhancedScraper');
    this.rateLimiter = new RateLimiter({
      maxRequests: config.scraping.maxRequestsPerMinute,
      timeWindow: 60 * 1000, // 1 minute
    });
  }

  private async initBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080',
        ],
      });
    }
  }

  private async getRandomUserAgent(): Promise<string> {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  private async fetchWithRetry(
    url: string,
    options: { maxRetries?: number; delay?: number } = {}
  ): Promise<string> {
    const { maxRetries = 3, delay = 1000 } = options;
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.rateLimiter.waitForToken();
        const response = await axios.get(url, {
          headers: {
            'User-Agent': await this.getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
          timeout: 10000,
        });
        return response.data;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Retry ${i + 1}/${maxRetries} failed for ${url}: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }

    throw new Error(`Failed to fetch ${url} after ${maxRetries} retries: ${lastError?.message}`);
  }

  private async scrapeWithPuppeteer(source: GrantSource): Promise<Grant[]> {
    await this.initBrowser();
    const page = await this.browser!.newPage();
    
    try {
      await page.setUserAgent(await this.getRandomUserAgent());
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setRequestInterception(true);
      
      // Optimize performance by blocking unnecessary resources
      page.on('request', (req) => {
        if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.goto(source.url, { waitUntil: 'networkidle0', timeout: 30000 });
      await this.autoScroll(page);

      const grants = await page.evaluate((selectors) => {
        const results: Partial<Grant>[] = [];
        const containers = document.querySelectorAll(selectors.container);

        containers.forEach((container) => {
          try {
            const titleEl = container.querySelector(selectors.title);
            const descEl = container.querySelector(selectors.description);
            const amountEl = container.querySelector(selectors.amount);
            const deadlineEl = container.querySelector(selectors.deadline);
            const linkEl = container.querySelector(selectors.link);

            if (titleEl && descEl) {
              results.push({
                title: titleEl.textContent?.trim() || '',
                description: descEl.textContent?.trim() || '',
                amount: amountEl?.textContent?.trim(),
                deadline: deadlineEl?.textContent?.trim(),
                applicationUrl: (linkEl as HTMLAnchorElement)?.href || '',
                source: source.name,
                sectors: [],
                lastScrapedAt: new Date().toISOString(),
              });
            }
          } catch (error) {
            console.error('Error parsing grant element:', error);
          }
        });

        return results;
      }, source.selectors);

      return grants.map(grant => this.normalizeGrant(grant, source));
    } finally {
      await page.close();
    }
  }

  private async scrapeWithCheerio(source: GrantSource): Promise<Grant[]> {
    const html = await this.fetchWithRetry(source.url);
    const $ = cheerio.load(html);
    const grants: Partial<Grant>[] = [];

    $(source.selectors.container).each((_, element) => {
      try {
        const titleEl = $(element).find(source.selectors.title);
        const descEl = $(element).find(source.selectors.description);
        const amountEl = $(element).find(source.selectors.amount);
        const deadlineEl = $(element).find(source.selectors.deadline);
        const linkEl = $(element).find(source.selectors.link);

        if (titleEl.length && descEl.length) {
          grants.push({
            title: titleEl.text().trim(),
            description: descEl.text().trim(),
            amount: amountEl.text().trim(),
            deadline: deadlineEl.text().trim(),
            applicationUrl: linkEl.attr('href') || '',
            source: source.name,
            sectors: [],
            lastScrapedAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        this.logger.error('Error parsing grant element:', error);
      }
    });

    return grants.map(grant => this.normalizeGrant(grant, source));
  }

  private normalizeGrant(grant: Partial<Grant>, source: GrantSource): Grant {
    const amount = extractAmount(grant.amount || '');
    const deadline = parseDate(grant.deadline || '');

    return {
      title: sanitizeHtml(grant.title || ''),
      description: sanitizeHtml(grant.description || ''),
      amount: amount || undefined,
      deadline: deadline || undefined,
      applicationUrl: grant.applicationUrl || '',
      source: source.name,
      sectors: source.sectors || [],
      lastScrapedAt: new Date(),
      status: deadline ? (deadline > new Date() ? 'open' : 'closed') : 'unknown',
    };
  }

  private async autoScroll(page: Page): Promise<void> {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  private async cacheGrants(grants: Grant[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    for (const grant of grants) {
      const key = `grant:${grant.source}:${grant.title}`;
      pipeline.setex(
        key,
        config.scraping.cacheTTL,
        JSON.stringify(grant)
      );
    }

    await pipeline.exec();
  }

  private async getCachedGrants(source: string): Promise<Grant[]> {
    const keys = await this.redis.keys(`grant:${source}:*`);
    if (!keys.length) return [];

    const cachedGrants = await this.redis.mget(keys);
    return cachedGrants
      .filter((grant): grant is string => grant !== null)
      .map(grant => JSON.parse(grant));
  }

  public async scrapeGrants(
    sources: GrantSource[],
    filters?: GrantFilters,
    sortOptions?: SortOptions,
    pagination?: PaginationOptions
  ): Promise<{ grants: Grant[]; total: number }> {
    let allGrants: Grant[] = [];

    for (const source of sources) {
      try {
        // Check cache first
        let grants = await this.getCachedGrants(source.name);

        if (!grants.length) {
          // If not in cache, scrape the source
          grants = source.scrapeMethod === 'dynamic'
            ? await this.scrapeWithPuppeteer(source)
            : await this.scrapeWithCheerio(source);

          // Cache the results
          await this.cacheGrants(grants);
        }

        allGrants = allGrants.concat(grants);
      } catch (error) {
        this.logger.error(`Error scraping ${source.name}:`, error);
      }
    }

    // Apply filters
    if (filters) {
      allGrants = allGrants.filter(grant => this.matchesFilters(grant, filters));
    }

    // Apply sorting
    if (sortOptions) {
      allGrants = this.sortGrants(allGrants, sortOptions);
    }

    const total = allGrants.length;

    // Apply pagination
    if (pagination) {
      const { page = 1, limit = 10 } = pagination;
      const start = (page - 1) * limit;
      allGrants = allGrants.slice(start, start + limit);
    }

    return { grants: allGrants, total };
  }

  private matchesFilters(grant: Grant, filters: GrantFilters): boolean {
    if (filters.sectors && filters.sectors.length > 0) {
      if (!grant.sectors.some(sector => filters.sectors!.includes(sector))) {
        return false;
      }
    }

    if (filters.amount) {
      const { min, max } = filters.amount;
      if (grant.amount) {
        if ((min && grant.amount.min < min) || (max && grant.amount.max > max)) {
          return false;
        }
      }
    }

    if (filters.deadline) {
      const { start, end } = filters.deadline;
      if (grant.deadline) {
        if ((start && grant.deadline < start) || (end && grant.deadline > end)) {
          return false;
        }
      }
    }

    if (filters.keywords && filters.keywords.length > 0) {
      const content = `${grant.title} ${grant.description}`.toLowerCase();
      if (!filters.keywords.some(keyword => content.includes(keyword.toLowerCase()))) {
        return false;
      }
    }

    return true;
  }

  private sortGrants(grants: Grant[], sortOptions: SortOptions): Grant[] {
    const { field, order = 'desc' } = sortOptions;
    
    return [...grants].sort((a, b) => {
      let comparison = 0;
      
      switch (field) {
        case 'amount':
          comparison = (a.amount?.min || 0) - (b.amount?.min || 0);
          break;
        case 'deadline':
          comparison = (a.deadline?.getTime() || 0) - (b.deadline?.getTime() || 0);
          break;
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
        default:
          return 0;
      }

      return order === 'desc' ? -comparison : comparison;
    });
  }

  public async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    await this.redis.quit();
  }
}
