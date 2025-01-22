import { RecommendationService } from '../services/recommendation.service';
import { Grant } from '../models/Grant';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('Recommendation Service', () => {
  let mongoServer: MongoMemoryServer;
  let recommendationService: RecommendationService;

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
    recommendationService = new RecommendationService();
  });

  const mockGrants = [
    {
      title: 'Healthcare Innovation Grant',
      description: 'Supporting innovative healthcare solutions using AI',
      organization: 'Medical Foundation',
      amount: { min: 50000, max: 100000, currency: 'USD' },
      deadline: new Date('2025-12-31'),
      categories: ['Healthcare', 'AI', 'Technology'],
      status: 'active',
      applicationUrl: 'https://example.com/healthcare-grant',
      eligibility: {
        regions: ['Global'],
        organizationTypes: ['Startups', 'Research Institutions'],
        requirements: ['Innovative healthcare solution', 'AI implementation']
      },
    },
    {
      title: 'Tech Startup Grant',
      description: 'General technology startup funding',
      organization: 'Tech Fund',
      amount: { min: 25000, max: 50000, currency: 'USD' },
      deadline: new Date('2025-12-31'),
      categories: ['Technology', 'Startups'],
      status: 'active',
      applicationUrl: 'https://example.com/tech-grant',
      eligibility: {
        regions: ['Global'],
        organizationTypes: ['Startups'],
        requirements: ['Technology focus', 'Early stage']
      },
    },
  ];

  const mockDeckAnalysis = {
    summary: 'AI-powered healthcare solution for early disease detection',
    entities: {
      organizations: ['HealthTech Inc'],
      technologies: ['AI', 'Machine Learning', 'Healthcare'],
      markets: ['Healthcare', 'Medical Technology'],
    },
    key_topics: [
      'artificial intelligence',
      'healthcare innovation',
      'disease detection',
      'medical technology',
    ],
  };

  test('should find matching grants based on pitch deck analysis', async () => {
    await Grant.insertMany(mockGrants);

    const recommendations = await recommendationService.getRecommendations(mockDeckAnalysis);

    expect(recommendations).toHaveLength(2);
    expect(recommendations[0].score).toBeGreaterThan(recommendations[1].score);
    expect(recommendations[0].grant.title).toBe('Healthcare Innovation Grant');
  });

  test('should apply filters correctly', async () => {
    await Grant.insertMany(mockGrants);

    const filters = {
      minAmount: 50000,
      categories: ['Healthcare'],
    };

    const recommendations = await recommendationService.getRecommendations(mockDeckAnalysis, filters);

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].grant.title).toBe('Healthcare Innovation Grant');
  });

  test('should filter by organization type', async () => {
    await Grant.insertMany(mockGrants);

    const filters = {
      organizationTypes: ['Research Institutions'],
    };

    const recommendations = await recommendationService.getRecommendations(mockDeckAnalysis, filters);

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].grant.eligibility.organizationTypes).toContain('Research Institutions');
  });

  test('should only return active grants', async () => {
    const inactiveGrant = {
      ...mockGrants[0],
      status: 'closed',
      title: 'Closed Healthcare Grant',
    };

    await Grant.insertMany([...mockGrants, inactiveGrant]);

    const recommendations = await recommendationService.getRecommendations(mockDeckAnalysis);

    expect(recommendations).toHaveLength(2);
    expect(recommendations.every((r: any) => r.grant.status === 'active')).toBe(true);
  });

  test('should handle empty deck analysis', async () => {
    await Grant.insertMany(mockGrants);

    const emptyAnalysis = {
      summary: '',
      entities: {
        organizations: [],
        technologies: [],
        markets: [],
      },
      key_topics: [],
    };

    const recommendations = await recommendationService.getRecommendations(emptyAnalysis);

    expect(recommendations).toHaveLength(2);
    expect(recommendations[0].score).toBeLessThan(0.5);
  });
});
