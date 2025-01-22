import nock from 'nock';
import { GrantScraper } from '../services/scraper';
import { Grant } from '../models/Grant';

// Enable nock debugging
nock.disableNetConnect();
nock.enableNetConnect('127.0.0.1');

describe('GrantScraper', () => {
  let scraper: GrantScraper;

  beforeEach(async () => {
    scraper = new GrantScraper();
    await Grant.deleteMany({});
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  const mockHtml = `
    <div class="grant-listing">
      <h2>Test Grant 1</h2>
      <div class="description">Test description 1</div>
      <div class="organization">Test Org 1</div>
      <div class="amount">$50,000 - $100,000</div>
      <div class="deadline">2024-12-31</div>
      <div class="categories">Tech, Education</div>
      <a href="https://example.com/apply1">Apply Now</a>
    </div>
    <div class="grant-listing">
      <h2>Test Grant 2</h2>
      <div class="description">Test description 2</div>
      <div class="organization">Test Org 2</div>
      <div class="amount">$75,000 - $150,000</div>
      <div class="deadline">2024-12-31</div>
      <div class="categories">Science, Research</div>
      <a href="https://example.com/apply2">Apply Now</a>
    </div>
  `;

  it('should scrape grants from HTML content', async () => {
    const url = 'https://example.com/grants';
    const scope = nock('https://example.com')
      .get('/grants')
      .reply(200, mockHtml);

    const grants = await scraper.scrapeGrants(url);
    expect(scope.isDone()).toBe(true);
    expect(grants).toHaveLength(2);
    expect(grants[0]).toMatchObject({
      title: 'Test Grant 1',
      description: 'Test description 1',
      organization: 'Test Org 1',
      applicationUrl: 'https://example.com/apply1',
      lastScrapedFrom: url,
      amount: {
        min: 50000,
        max: 100000,
        currency: 'USD'
      }
    });
  });

  it('should handle invalid HTML content', async () => {
    const url = 'https://example.com/grants';
    const scope = nock('https://example.com')
      .get('/grants')
      .reply(200, '<div>Invalid HTML without grant listings</div>');

    const grants = await scraper.scrapeGrants(url);
    expect(scope.isDone()).toBe(true);
    expect(grants).toHaveLength(0);
  });

  it('should save scraped grants to database', async () => {
    const url = 'https://example.com/grants';
    const scope = nock('https://example.com')
      .get('/grants')
      .reply(200, mockHtml);

    await scraper.scrapeAndSaveGrants(url);
    expect(scope.isDone()).toBe(true);

    const savedGrants = await Grant.find({});
    expect(savedGrants).toHaveLength(2);
    expect(savedGrants[0]).toMatchObject({
      title: 'Test Grant 1',
      description: 'Test description 1',
      organization: 'Test Org 1',
      applicationUrl: 'https://example.com/apply1',
      lastScrapedFrom: url,
      status: 'active',
      amount: {
        min: 50000,
        max: 100000,
        currency: 'USD'
      }
    });
  });

  it('should update existing grants instead of creating duplicates', async () => {
    const url = 'https://example.com/grants';
    const existingGrant = await Grant.create({
      title: 'Test Grant 1',
      description: 'Old description',
      organization: 'Test Org 1',
      applicationUrl: 'https://example.com/apply1',
      status: 'active',
      lastScrapedFrom: url,
      deadline: new Date('2024-12-31'),
      amount: {
        min: 50000,
        max: 100000,
        currency: 'USD'
      },
      eligibility: {
        regions: ['Global'],
        organizationTypes: [],
        requirements: []
      }
    });

    const scope = nock('https://example.com')
      .get('/grants')
      .reply(200, mockHtml);

    await scraper.scrapeAndSaveGrants(url);
    expect(scope.isDone()).toBe(true);

    const grants = await Grant.find({});
    expect(grants).toHaveLength(2);
    const updatedGrant = await Grant.findById(existingGrant._id);
    expect(updatedGrant).toBeTruthy();
    expect(updatedGrant?.description).toBe('Test description 1');
  });

  it('should mark removed grants as inactive', async () => {
    const url = 'https://example.com/grants';
    const removedGrant = await Grant.create({
      title: 'Removed Grant',
      description: 'This grant will be removed',
      organization: 'Old Org',
      applicationUrl: 'https://example.com/removed',
      status: 'active',
      lastScrapedFrom: url,
      deadline: new Date('2024-12-31'),
      amount: {
        min: 50000,
        max: 100000,
        currency: 'USD'
      },
      eligibility: {
        regions: ['Global'],
        organizationTypes: [],
        requirements: []
      }
    });

    const scope = nock('https://example.com')
      .get('/grants')
      .reply(200, mockHtml);

    await scraper.scrapeAndSaveGrants(url);
    expect(scope.isDone()).toBe(true);

    const updatedGrant = await Grant.findById(removedGrant._id);
    expect(updatedGrant).toBeTruthy();
    expect(updatedGrant?.status).toBe('inactive');
  });
});
