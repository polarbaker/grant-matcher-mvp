import { recommendationService } from '../services/recommendation.service';
import { Grant } from '../models/Grant';
import { Recommendation } from '../models/Recommendation';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { jest } from '@jest/globals';

jest.mock('openai');

describe('Recommendation Service', () => {
  let mongoServer: MongoMemoryServer;
  let service = recommendationService;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Grant.deleteMany({});
    await Recommendation.deleteMany({});
    await Grant.insertMany(mockGrants);
  });

  afterEach(async () => {
    await Recommendation.deleteMany({});
  });

  const mockGrants = [
    {
      title: 'Healthcare Innovation Grant',
      description: 'Grant for healthcare startups',
      organization: 'Healthcare Foundation',
      amount: {
        min: 10000,
        max: 50000,
        currency: 'USD'
      },
      deadline: new Date('2024-12-31'),
      categories: ['Healthcare', 'Technology'],
      eligibility: {
        organizationTypes: ['Startups', 'Research Institutions'],
        regions: ['North America'],
        requirements: ['Less than 5 years old']
      },
      status: 'active',
      source: 'Healthcare Foundation Portal',
      url: 'https://healthcare-foundation.org/grants/innovation',
      applicationUrl: 'https://healthcare-foundation.org/apply',
      feedback: [],
      applicationCount: 0
    },
    {
      title: 'Tech Startup Grant',
      description: 'Grant for technology startups',
      organization: 'Tech Fund',
      amount: {
        min: 20000,
        max: 100000,
        currency: 'USD'
      },
      deadline: new Date('2024-11-30'),
      categories: ['Technology', 'Innovation'],
      eligibility: {
        organizationTypes: ['Startups'],
        regions: ['Global'],
        requirements: ['Must be a technology company']
      },
      status: 'active',
      source: 'Tech Fund Website',
      url: 'https://techfund.org/grants/startup',
      applicationUrl: 'https://techfund.org/apply',
      feedback: [],
      applicationCount: 0
    }
  ];

  test('should find matching grants based on pitch deck analysis', async () => {
    const mockDeckAnalysis = {
      industry: 'Technology',
      businessModel: 'SaaS',
      targetMarket: 'Enterprise',
      fundingStage: 'Seed'
    };

    const recommendations = await service.generateRecommendations('test-user', mockDeckAnalysis);

    expect(recommendations).toHaveLength(2);
    expect(recommendations[0].matchScore).toBeGreaterThanOrEqual(0.1);
    expect(recommendations[1].matchScore).toBeGreaterThanOrEqual(0.1);
  });

  test('should apply filters correctly', async () => {
    const mockDeckAnalysis = {
      industry: 'Healthcare',
      businessModel: 'B2B',
      targetMarket: 'Healthcare Providers',
      fundingStage: 'Series A'
    };

    const filters = {
      categories: ['Healthcare']
    };

    const recommendations = await service.generateRecommendations('test-user', mockDeckAnalysis, filters);

    expect(recommendations).toBeDefined();
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.some(r => r.title.includes('Healthcare'))).toBe(true);
  });

  test('should filter by organization type', async () => {
    const mockDeckAnalysis = {
      industry: 'Research',
      businessModel: 'Non-profit',
      targetMarket: 'Academic',
      fundingStage: 'Grant'
    };

    const recommendations = await service.generateRecommendations('test-user', mockDeckAnalysis);
    const grant = await Grant.findById(recommendations[0].grantId);

    expect(recommendations).toBeDefined();
    expect(recommendations.length).toBeGreaterThan(0);
    expect(grant).toBeDefined();
  });

  test('should only return active grants', async () => {
    const mockDeckAnalysis = {
      industry: 'Technology',
      businessModel: 'SaaS',
      targetMarket: 'Enterprise',
      fundingStage: 'Seed'
    };

    const recommendations = await service.generateRecommendations(
      'test-user',
      mockDeckAnalysis
    );

    expect(recommendations).toBeDefined();
    expect(recommendations.length).toBeGreaterThan(0);
    const grantIds = recommendations.map(r => r.grantId);
    const grants = await Promise.all(grantIds.map(id => Grant.findById(id)));
    expect(grants.every(grant => grant?.status === 'active')).toBe(true);
  });

  test('should handle empty profile', async () => {
    const emptyProfile = {
      organization: {
        type: '',
        size: ''
      },
      expertise: [],
      previousGrants: []
    };

    const recommendations = await service.generateRecommendations('test-user', undefined, emptyProfile);

    expect(recommendations).toHaveLength(2);
    expect(recommendations[0].matchScore).toBeLessThan(0.5);
  });
});
