import axios from 'axios';
import * as cheerio from 'cheerio';
import { Grant, IGrant } from '../models/Grant';
import { logger } from '../utils/logger';

type CheerioRoot = ReturnType<typeof cheerio.load>;

export class GrantScraper {
  async scrapeGrants(url: string): Promise<Partial<IGrant>[]> {
    try {
      logger.info('Scraping grants from URL:', url);
      const response = await axios.get(url, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response || !response.data) {
        throw new Error('Failed to fetch grants: Empty response');
      }

      logger.info('Response data type:', typeof response.data);
      logger.info('Response data:', response.data);

      const $ = cheerio.load(response.data.toString());
      const grants: Partial<IGrant>[] = [];

      $('.grant-listing').each((_, element) => {
        try {
          const grant = this.parseGrantElement(element, $);
          if (grant) {
            grant.lastScrapedFrom = url;
            grants.push(grant);
          }
        } catch (error) {
          logger.error('Error parsing grant element:', error);
        }
      });

      if (grants.length === 0 && $('.grant-listing').length > 0) {
        throw new Error('Failed to parse any grants from the page');
      }

      return grants;
    } catch (error) {
      logger.error('Error scraping grants:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return [];
        }
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          throw new Error('Failed to fetch grants');
        }
        throw new Error('Failed to fetch grants');
      }
      throw error;
    }
  }

  private parseGrantElement(element: cheerio.Element, $: CheerioRoot): Partial<IGrant> | null {
    try {
      const $element = $(element);
      
      const title = $element.find('h2').text().trim();
      const description = $element.find('.description').text().trim();
      const organization = $element.find('.organization').text().trim();
      const applicationUrl = $element.find('a').attr('href') || '';

      if (!title || !description || !organization || !applicationUrl) {
        return null;
      }

      // Parse amount string (e.g., "$50,000 - $100,000")
      const amountText = $element.find('.amount').text().trim();
      const amounts = amountText.match(/\$?([\d,]+)/g);
      let amount: { min: number; max: number; currency: string } | undefined;
      
      if (amounts && amounts.length >= 2) {
        const min = parseInt(amounts[0].replace(/[\$,]/g, ''));
        const max = parseInt(amounts[1].replace(/[\$,]/g, ''));
        if (!isNaN(min) && !isNaN(max)) {
          amount = {
            min,
            max,
            currency: 'USD'
          };
        }
      }

      // Parse categories
      const categories = $element.find('.categories')
        .text()
        .split(',')
        .map((c: string) => c.trim())
        .filter((c: string) => c);

      // Parse deadline
      const deadlineText = $element.find('.deadline').text().trim();
      const deadline = new Date(deadlineText);
      if (isNaN(deadline.getTime())) {
        return null;
      }

      return {
        title,
        description,
        amount,
        deadline,
        categories,
        organization,
        applicationUrl,
        status: 'active',
        eligibility: {
          regions: ['Global'], // Default value
          organizationTypes: [], // Will be populated based on description analysis
          requirements: [], // Will be populated based on description analysis
        }
      };
    } catch (error) {
      logger.error('Error parsing grant element:', error);
      return null;
    }
  }

  async scrapeAndSaveGrants(url: string): Promise<void> {
    try {
      const grants = await this.scrapeGrants(url);
      
      for (const grant of grants) {
        try {
          if (!grant.title || !grant.organization || !grant.applicationUrl) {
            logger.error('Invalid grant data:', grant);
            continue;
          }

          // Try to find an existing grant with the same identifying information
          const existingGrant = await Grant.findOne({
            title: grant.title,
            organization: grant.organization,
            applicationUrl: grant.applicationUrl
          });

          if (existingGrant) {
            // Update existing grant
            await Grant.findByIdAndUpdate(existingGrant._id, {
              ...grant,
              lastUpdated: new Date()
            });
          } else {
            // Create new grant
            await Grant.create({
              ...grant,
              createdAt: new Date(),
              lastUpdated: new Date()
            });
          }
        } catch (error) {
          logger.error('Error saving grant:', error);
        }
      }

      // Mark grants not found in the current scrape as inactive
      const activeGrants = await Grant.find({ status: 'active' });
      for (const activeGrant of activeGrants) {
        const stillExists = grants.some(
          g => g.title === activeGrant.title && 
               g.organization === activeGrant.organization && 
               g.applicationUrl === activeGrant.applicationUrl
        );
        
        if (!stillExists) {
          await Grant.findByIdAndUpdate(activeGrant._id, {
            status: 'inactive',
            lastUpdated: new Date()
          });
        }
      }
    } catch (error) {
      logger.error('Error in scrapeAndSaveGrants:', error);
      throw error;
    }
  }
}
