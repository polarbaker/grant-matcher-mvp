import { findMatchingGrants } from '../services/grant-matcher';
import { Grant } from '../models/Grant';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('Grant Matching Service', () => {
  let mongoServer: MongoMemoryServer;

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
      createdAt: new Date(),
      updatedAt: new Date()
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
      createdAt: new Date(),
      updatedAt: new Date()
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
    // Insert mock grants
    await Grant.insertMany(mockGrants);

    const matches = await findMatchingGrants(mockDeckAnalysis);

    expect(matches).toHaveLength(2);
    expect(matches[0].score).toBeGreaterThan(matches[1].score);
    expect(matches[0].grant.title).toBe('Healthcare Innovation Grant');
  });

  test('should apply filters correctly', async () => {
    await Grant.insertMany(mockGrants);

    const filters = {
      minAmount: 75000,
      categories: ['Healthcare'],
    };

    const matches = await findMatchingGrants(mockDeckAnalysis, filters);

    expect(matches).toHaveLength(1);
    expect(matches[0].grant.title).toBe('Healthcare Innovation Grant');
  });

  test('should only return active grants', async () => {
    // Add an inactive grant
    const inactiveGrant = {
      ...mockGrants[0],
      status: 'closed',
      title: 'Closed Healthcare Grant',
    };

    await Grant.insertMany([...mockGrants, inactiveGrant]);

    const matches = await findMatchingGrants(mockDeckAnalysis);

    expect(matches).toHaveLength(2);
    expect(matches.every(m => m.grant.status === 'active')).toBe(true);
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

    const matches = await findMatchingGrants(emptyAnalysis);

    expect(matches).toHaveLength(2);
    // Should still return grants but with lower similarity scores
    expect(matches[0].score).toBeLessThan(0.5);
  });
});
