import { GrantScraper } from '../services/scraper';
import { Grant } from '../models/Grant';
import { logger } from '../utils/logger';

describe('GrantScraper Service', () => {
  let scraper: GrantScraper;

  beforeEach(async () => {
    scraper = new GrantScraper();
    await Grant.deleteMany({});
  });

  it('should save grants to database', async () => {
    const grant = {
      title: 'Test Grant',
      description: 'A test grant description',
      organization: 'Test Org',
      amount: {
        min: 50000,
        max: 100000,
        currency: 'USD'
      },
      deadline: new Date('2024-12-31'),
      categories: ['Tech', 'Education'],
      applicationUrl: 'https://example.com/apply',
      status: 'active',
      lastScrapedFrom: 'https://example.com/grants',
      eligibility: {
        regions: ['Global'],
        organizationTypes: [],
        requirements: []
      }
    };

    await Grant.create(grant);

    const savedGrant = await Grant.findOne({ title: 'Test Grant' });
    expect(savedGrant).toBeTruthy();
    expect(savedGrant).toMatchObject({
      title: 'Test Grant',
      description: 'A test grant description',
      organization: 'Test Org',
      applicationUrl: 'https://example.com/apply',
      status: 'active',
      lastScrapedFrom: 'https://example.com/grants'
    });
  });

  it('should update existing grant', async () => {
    const grant = {
      title: 'Test Grant',
      description: 'Initial description',
      organization: 'Test Org',
      amount: {
        min: 50000,
        max: 100000,
        currency: 'USD'
      },
      deadline: new Date('2024-12-31'),
      categories: ['Tech', 'Education'],
      applicationUrl: 'https://example.com/apply',
      status: 'active',
      lastScrapedFrom: 'https://example.com/grants',
      eligibility: {
        regions: ['Global'],
        organizationTypes: [],
        requirements: []
      }
    };

    const savedGrant = await Grant.create(grant);

    const updatedGrant = {
      ...grant,
      description: 'Updated description'
    };

    await Grant.findByIdAndUpdate(savedGrant._id, updatedGrant);

    const retrievedGrant = await Grant.findOne({ title: 'Test Grant' });
    expect(retrievedGrant).toBeTruthy();
    expect(retrievedGrant?.description).toBe('Updated description');
  });

  it('should mark grant as inactive', async () => {
    const grant = {
      title: 'Test Grant',
      description: 'A test grant description',
      organization: 'Test Org',
      amount: {
        min: 50000,
        max: 100000,
        currency: 'USD'
      },
      deadline: new Date('2024-12-31'),
      categories: ['Tech', 'Education'],
      applicationUrl: 'https://example.com/apply',
      status: 'active',
      lastScrapedFrom: 'https://example.com/grants',
      eligibility: {
        regions: ['Global'],
        organizationTypes: [],
        requirements: []
      }
    };

    const savedGrant = await Grant.create(grant);

    await Grant.findByIdAndUpdate(savedGrant._id, { status: 'inactive' });

    const retrievedGrant = await Grant.findOne({ title: 'Test Grant' });
    expect(retrievedGrant).toBeTruthy();
    expect(retrievedGrant?.status).toBe('inactive');
  });
});
