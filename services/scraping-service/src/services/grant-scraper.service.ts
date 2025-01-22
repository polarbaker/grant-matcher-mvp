import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import axios from 'axios';
import { Grant } from '../models/Grant';
import { logger } from '../utils/logger';

interface GrantSource {
  name: string;
  url: string;
  scrapeMethod: 'static' | 'dynamic';
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
      selectors: {
        container: '.grant-item',
        title: '.grant-title',
        description: '.grant-description',
        amount: '.grant-amount',
        deadline: '.grant-deadline',
        link: '.grant-link',
      },
    },
    // Add more grant sources here
  ];

  private async scrapeStaticPage(source: GrantSource): Promise<any[]> {
    try {
      const response = await axios.get(source.url);
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
      logger.error(`Error scraping ${source.name}:`, error);
      return [];
    }
  }

  private async scrapeDynamicPage(source: GrantSource): Promise<any[]> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.goto(source.url, { waitUntil: 'networkidle0' });

      // Wait for the grants to load
      await page.waitForSelector(source.selectors.container);

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

      return grants;
    } catch (error) {
      logger.error(`Error scraping ${source.name}:`, error);
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private parseAmount(amountStr: string): { min: number; max: number; currency: string } {
    try {
      const cleaned = amountStr.replace(/[^0-9.-]/g, '');
      const amount = parseFloat(cleaned);
      return {
        min: amount,
        max: amount,
        currency: 'USD',
      };
    } catch (error) {
      return {
        min: 0,
        max: 0,
        currency: 'USD',
      };
    }
  }

  private isValidGrant(grant: any): boolean {
    return (
      grant.title &&
      grant.description &&
      grant.applicationUrl &&
      grant.deadline &&
      grant.deadline > new Date()
    );
  }

  public async scrapeAllSources(): Promise<void> {
    for (const source of this.sources) {
      try {
        logger.info(`Starting to scrape ${source.name}`);
        
        const grants = await (source.scrapeMethod === 'static'
          ? this.scrapeStaticPage(source)
          : this.scrapeDynamicPage(source));

        // Save to database
        for (const grantData of grants) {
          await Grant.findOneAndUpdate(
            { applicationUrl: grantData.applicationUrl },
            { ...grantData, lastUpdated: new Date() },
            { upsert: true, new: true }
          );
        }

        logger.info(`Completed scraping ${source.name}, found ${grants.length} grants`);
      } catch (error) {
        logger.error(`Error processing ${source.name}:`, error);
      }
    }
  }
}
