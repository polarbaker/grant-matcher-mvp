import puppeteer from 'puppeteer';
import puppeteer_extra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Page } from 'puppeteer';
import cheerio from 'cheerio';
import axios from 'axios';
import { logger } from '../utils/logger';
import { sleep } from '../utils/helpers';
import { Grant, GrantSector, GrantFilters, GrantAmount } from '../types/grant.types';
import { fuzzySearch } from '../utils/fuzzySearch';
import { 
  SortField, 
  SortOrder, 
  PaginationOptions, 
  SortOptions,
  FILTER_PRESETS,
  FilterPreset
} from '../types/filter.types';

// Add stealth plugin to puppeteer
puppeteer_extra.use(StealthPlugin());

interface GrantSource {
  name: string;
  url: string;
  scrapeMethod: 'static' | 'dynamic';
  sectors: GrantSector[];
  selectors: {
    container: string;
    title: string;
    description: string;
    amount: string;
    deadline: string;
    link: string;
  };
}

export class GrantScraper {
  private sources: GrantSource[] = [
    {
      name: 'grants.gov',
      url: 'https://www.grants.gov/web/grants/search-grants.html',
      scrapeMethod: 'dynamic',
      sectors: [GrantSector.GENERAL],
      selectors: {
        container: '.grant-item',
        title: '.grant-title',
        description: '.grant-description',
        amount: '.grant-amount',
        deadline: '.grant-deadline',
        link: '.grant-link',
      },
    },
    {
      name: 'nsf.gov',
      url: 'https://www.nsf.gov/funding/pgm_list.jsp?org=NSF',
      scrapeMethod: 'static',
      sectors: [GrantSector.SCIENCE, GrantSector.RESEARCH],
      selectors: {
        container: '.fundingOpp',
        title: '.title',
        description: '.synopsis',
        amount: '.award-info',
        deadline: '.deadline-date',
        link: 'a.program-link',
      },
    },
    {
      name: 'grantwatch.com',
      url: 'https://www.grantwatch.com/grant-search.php',
      scrapeMethod: 'dynamic',
      sectors: [GrantSector.GENERAL],
      selectors: {
        container: '.grant-listing',
        title: '.grant-title h3',
        description: '.grant-description p',
        amount: '.grant-amount span',
        deadline: '.deadline-info time',
        link: '.view-grant-link',
      },
    },
    {
      name: 'foundation.mozilla.org',
      url: 'https://foundation.mozilla.org/en/what-we-fund/',
      scrapeMethod: 'static',
      sectors: [GrantSector.TECHNOLOGY],
      selectors: {
        container: '.funding-opportunity',
        title: '.opportunity-title',
        description: '.opportunity-description',
        amount: '.grant-range',
        deadline: '.application-deadline',
        link: '.apply-link',
      },
    },
    {
      name: 'wellcome.org',
      url: 'https://wellcome.org/grant-funding',
      scrapeMethod: 'dynamic',
      sectors: [GrantSector.HEALTH],
      selectors: {
        container: '.funding-opportunity-card',
        title: '.card-title',
        description: '.card-description',
        amount: '.funding-amount',
        deadline: '.deadline-text',
        link: '.opportunity-link',
      },
    },
    {
      name: 'mellon.org',
      url: 'https://mellon.org/grants/grants-database/',
      scrapeMethod: 'dynamic',
      sectors: [GrantSector.EDUCATION],
      selectors: {
        container: '.grant-item',
        title: '.grant-name',
        description: '.grant-abstract',
        amount: '.award-amount',
        deadline: '.due-date',
        link: '.details-link',
      },
    },
    {
      name: 'fordfoundation.org',
      url: 'https://www.fordfoundation.org/work/our-grants/',
      scrapeMethod: 'dynamic',
      sectors: [GrantSector.GENERAL],
      selectors: {
        container: '.grant-opportunity',
        title: '.opportunity-heading',
        description: '.opportunity-text',
        amount: '.grant-amount',
        deadline: '.submission-deadline',
        link: '.apply-now',
      },
    },
    {
      name: 'climateworks.org',
      url: 'https://www.climateworks.org/funding-opportunities/',
      scrapeMethod: 'static',
      sectors: [GrantSector.ENVIRONMENT],
      selectors: {
        container: '.funding-item',
        title: '.opportunity-title',
        description: '.opportunity-desc',
        amount: '.funding-amount',
        deadline: '.submission-date',
        link: '.apply-button',
      },
    },
    {
      name: 'gatesfoundation.org',
      url: 'https://www.gatesfoundation.org/about/committed-grants',
      scrapeMethod: 'dynamic',
      sectors: [GrantSector.HEALTH],
      selectors: {
        container: '.grant-opportunity',
        title: '.grant-title',
        description: '.grant-description',
        amount: '.grant-amount',
        deadline: '.deadline',
        link: '.apply-link',
      },
    },
    {
      name: 'techstars.com',
      url: 'https://www.techstars.com/accelerators',
      scrapeMethod: 'dynamic',
      sectors: [GrantSector.TECHNOLOGY],
      selectors: {
        container: '.program-card',
        title: '.program-title',
        description: '.program-description',
        amount: '.investment-details',
        deadline: '.application-deadline',
        link: '.apply-now',
      },
    },
    {
      name: 'ycombinator.com',
      url: 'https://www.ycombinator.com/programs',
      scrapeMethod: 'static',
      sectors: [GrantSector.TECHNOLOGY],
      selectors: {
        container: '.program-listing',
        title: '.program-name',
        description: '.program-details',
        amount: '.funding-info',
        deadline: '.batch-deadline',
        link: '.apply-link',
      },
    },
    {
      name: 'niaid.nih.gov',
      url: 'https://www.niaid.nih.gov/grants-contracts/opportunities',
      scrapeMethod: 'static',
      sectors: [GrantSector.HEALTH],
      selectors: {
        container: '.funding-opportunity',
        title: '.opportunity-title',
        description: '.description',
        amount: '.award-amount',
        deadline: '.due-date',
        link: '.opportunity-link',
      },
    },
    {
      name: 'energy.gov',
      url: 'https://www.energy.gov/eere/funding-opportunities',
      scrapeMethod: 'dynamic',
      sectors: [GrantSector.ENVIRONMENT],
      selectors: {
        container: '.opportunity-item',
        title: '.opportunity-title',
        description: '.opportunity-description',
        amount: '.award-amount',
        deadline: '.close-date',
        link: '.opportunity-link',
      },
    },
    {
      name: 'darpa.mil',
      url: 'https://www.darpa.mil/work-with-us/opportunities',
      scrapeMethod: 'dynamic',
      sectors: [GrantSector.DEFENSE],
      selectors: {
        container: '.opportunity',
        title: '.opp-title',
        description: '.opp-description',
        amount: '.award-info',
        deadline: '.due-date',
        link: '.details-link',
      },
    },
    {
      name: 'erc.europa.eu',
      url: 'https://erc.europa.eu/funding',
      scrapeMethod: 'static',
      sectors: [GrantSector.RESEARCH],
      selectors: {
        container: '.call-item',
        title: '.call-title',
        description: '.call-description',
        amount: '.grant-value',
        deadline: '.submission-deadline',
        link: '.call-link',
      },
    },
    {
      name: 'nasa.gov',
      url: 'https://www.nasa.gov/stem/stem-grants/',
      scrapeMethod: 'dynamic',
      sectors: [GrantSector.SCIENCE],
      selectors: {
        container: '.grant-opportunity',
        title: '.grant-title',
        description: '.grant-description',
        amount: '.funding-amount',
        deadline: '.due-date',
        link: '.apply-link',
      },
    },
    {
      name: 'rockefellerfoundation.org',
      url: 'https://www.rockefellerfoundation.org/grants/',
      scrapeMethod: 'dynamic',
      sectors: [GrantSector.GENERAL],
      selectors: {
        container: '.grant-item',
        title: '.grant-title',
        description: '.grant-description',
        amount: '.grant-amount',
        deadline: '.deadline',
        link: '.apply-now',
      },
    },
    {
      name: 'macfound.org',
      url: 'https://www.macfound.org/programs/',
      scrapeMethod: 'static',
      sectors: [GrantSector.GENERAL],
      selectors: {
        container: '.program-item',
        title: '.program-title',
        description: '.program-description',
        amount: '.grant-range',
        deadline: '.deadline',
        link: '.learn-more',
      },
    }
  ];

  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000;

  private matchesFilters(grant: Grant, filters: GrantFilters): boolean {
    // Check sectors
    if (filters.sectors?.length) {
      const hasMatchingSector = grant.sectors.some(sector =>
        filters.sectors!.includes(sector)
      );
      if (!hasMatchingSector) return false;
    }

    // Check amount
    if (filters.amount) {
      if (!grant.amount) return false;
      
      const grantMin = grant.amount.min || 0;
      const grantMax = grant.amount.max || Infinity;
      
      if (filters.amount.min && grantMin < filters.amount.min) {
        return false;
      }
      if (filters.amount.max && grantMax > filters.amount.max) {
        return false;
      }
    }

    // Check deadline
    if (filters.deadline) {
      if (!grant.deadline) return false;
      
      if (filters.deadline.start && grant.deadline < filters.deadline.start) {
        return false;
      }
      if (filters.deadline.end && grant.deadline > filters.deadline.end) {
        return false;
      }
    }

    // Check keywords
    if (filters.keywords && filters.keywords.length > 0) {
      const content = `${grant.title} ${grant.description}`.toLowerCase();
      if (!filters.keywords.some(keyword => content.includes(keyword.toLowerCase()))) {
        return false;
      }
    }

    // Check source names
    if (filters.sourceNames && filters.sourceNames.length > 0) {
      if (!filters.sourceNames.includes(grant.source)) {
        return false;
      }
    }

    return true;
  }

  private sortGrants(grants: Grant[], sortOptions?: SortOptions): Grant[] {
    if (!sortOptions) return grants;

    return [...grants].sort((a, b) => {
      switch (sortOptions.field) {
        case SortField.AMOUNT:
          const aAmount = a.amount?.min || 0;
          const bAmount = b.amount?.min || 0;
          return sortOptions.order === SortOrder.ASC 
            ? aAmount - bAmount 
            : bAmount - aAmount;

        case SortField.DEADLINE:
          const aDate = a.deadline?.getTime() || Number.MAX_SAFE_INTEGER;
          const bDate = b.deadline?.getTime() || Number.MAX_SAFE_INTEGER;
          return sortOptions.order === SortOrder.ASC 
            ? aDate - bDate 
            : bDate - aDate;

        default:
          return 0;
      }
    });
  }

  private paginateGrants(grants: Grant[], pagination?: PaginationOptions): Grant[] {
    if (!pagination) return grants;

    const startIndex = (pagination.page - 1) * pagination.limit;
    return grants.slice(startIndex, startIndex + pagination.limit);
  }

  async scrapeAllSources(
    filters?: GrantFilters,
    sortOptions?: SortOptions,
    pagination?: PaginationOptions
  ): Promise<{ grants: Grant[]; total: number }> {
    let allGrants: Grant[] = [];
    
    // Filter sources if sourceNames is specified
    const sourcesToScrape = filters?.sourceNames 
      ? this.sources.filter(source => filters.sourceNames!.includes(source.name))
      : this.sources;

    // Use Promise.all for concurrent scraping
    const scrapePromises = sourcesToScrape.map(async (source) => {
      try {
        const grants = source.scrapeMethod === 'static' 
          ? await this.scrapeStaticPage(source)
          : await this.scrapeDynamicPage(source);
        
        return grants.map(grant => ({
          ...grant,
          sectors: source.sectors,
          lastScrapedAt: new Date(),
        }));
      } catch (error) {
        logger.error(`Error scraping source ${source.name}:`, error);
        return [];
      }
    });

    const grantsArrays = await Promise.all(scrapePromises);
    allGrants = grantsArrays.flat();

    // Apply filters
    if (filters) {
      // Apply fuzzy search if keywords are present
      if (filters.keywords?.length) {
        const fuzzyResults = filters.keywords.reduce((grants, keyword) => {
          return fuzzySearch(grants, keyword);
        }, allGrants);
        allGrants = fuzzyResults;
      }

      // Apply other filters
      allGrants = allGrants.filter(grant => this.matchesFilters(grant, filters));
    }

    // Get total before pagination
    const total = allGrants.length;

    // Apply sorting
    allGrants = this.sortGrants(allGrants, sortOptions);

    // Apply pagination
    allGrants = this.paginateGrants(allGrants, pagination);

    return { grants: allGrants, total };
  }

  async getFilterPresets(): Promise<FilterPreset[]> {
    return FILTER_PRESETS;
  }

  async applyFilterPreset(presetName: string): Promise<GrantFilters | undefined> {
    const preset = FILTER_PRESETS.find(p => p.name === presetName);
    if (!preset) return undefined;

    // Deep clone the filters to avoid modifying the preset
    return JSON.parse(JSON.stringify(preset.filters));
  }

  async getSupportedSectors(): Promise<GrantSector[]> {
    const sectors = new Set<GrantSector>();
    this.sources.forEach(source => {
      source.sectors.forEach(sector => sectors.add(sector));
    });
    return Array.from(sectors);
  }

  async getSourceNames(): Promise<string[]> {
    return this.sources.map(source => source.name);
  }

  private async scrapeStaticPage(source: GrantSource): Promise<any[]> {
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await axios.get(source.url, {
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          timeout: 30000 // 30 seconds timeout
        });

        const $ = cheerio.load(response.data);
        const grants: any[] = [];

        $(source.selectors.container).each((_, element) => {
          const grant = {
            title: $(element).find(source.selectors.title).text().trim(),
            description: $(element).find(source.selectors.description).text().trim(),
            amount: this.parseAmount($(element).find(source.selectors.amount).text()),
            deadline: new Date($(element).find(source.selectors.deadline).text()),
            applicationUrl: $(element).find(source.selectors.link).attr('href'),
            source: source.name,
          };

          if (this.isValidGrant(grant)) {
            grants.push(grant);
          }
        });

        return grants;
      } catch (error) {
        logger.error(`Error scraping ${source.name} (attempt ${attempt}/${this.MAX_RETRIES}):`, error);
        if (attempt === this.MAX_RETRIES) {
          return [];
        }
        await sleep(this.RETRY_DELAY * attempt);
      }
    }
    return [];
  }

  private async scrapeDynamicPage(source: GrantSource): Promise<any[]> {
    let browser;
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        browser = await puppeteer_extra.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1920x1080'
          ],
          defaultViewport: {
            width: 1920,
            height: 1080
          }
        });

        const page = await browser.newPage();
        
        // Set realistic viewport and user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // Add request interception
        await page.setRequestInterception(true);
        page.on('request', (request) => {
          // Block unnecessary resources
          if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
            request.abort();
          } else {
            request.continue();
          }
        });

        // Add random delays between actions
        await page.goto(source.url, { 
          waitUntil: 'networkidle0',
          timeout: 60000 // 60 seconds timeout
        });

        // Scroll page to simulate human behavior
        await this.autoScroll(page);

        // Wait for the grants to load
        await page.waitForSelector(source.selectors.container, { timeout: 30000 });

        const grants = await page.evaluate(
          (selectors) => {
            const items: any[] = [];
            document
              .querySelectorAll(selectors.container)
              .forEach((element) => {
                const grant = {
                  title: element.querySelector(selectors.title)?.textContent?.trim(),
                  description: element
                    .querySelector(selectors.description)
                    ?.textContent?.trim(),
                  amount: element.querySelector(selectors.amount)?.textContent,
                  deadline: element.querySelector(selectors.deadline)?.textContent,
                  applicationUrl: element
                    .querySelector(selectors.link)
                    ?.getAttribute('href'),
                };

                if (grant.title && grant.description) {
                  items.push(grant);
                }
              });
            return items;
          },
          source.selectors
        );

        return grants.map(grant => ({
          ...grant,
          source: source.name,
          amount: this.parseAmount(grant.amount),
          deadline: new Date(grant.deadline)
        }));

      } catch (error) {
        logger.error(`Error scraping ${source.name} (attempt ${attempt}/${this.MAX_RETRIES}):`, error);
        if (attempt === this.MAX_RETRIES) {
          return [];
        }
        await sleep(this.RETRY_DELAY * attempt);
      } finally {
        if (browser) {
          await browser.close();
        }
      }
    }
    return [];
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

  private parseAmount(amountStr: string): GrantAmount | undefined {
    if (!amountStr) return undefined;

    const amounts = amountStr.match(/\$?([\d,]+)/g);
    if (!amounts || amounts.length < 1) return undefined;

    const parseNumber = (str: string) => parseInt(str.replace(/[\$,]/g, ''));

    if (amounts.length === 1) {
      const amount = parseNumber(amounts[0]);
      return {
        min: amount,
        max: amount,
        currency: 'USD'
      };
    }

    return {
      min: parseNumber(amounts[0]),
      max: parseNumber(amounts[1]),
      currency: 'USD'
    };
  }

  private isValidGrant(grant: any): boolean {
    return (
      grant.title &&
      grant.description &&
      grant.applicationUrl &&
      (grant.amount || grant.deadline)
    );
  }
}
