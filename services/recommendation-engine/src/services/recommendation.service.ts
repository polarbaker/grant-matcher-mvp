import { Redis } from 'ioredis';
import { IGrant } from '../models/schema';
import { LLMService } from './llm.service';
import { MatchingService } from './matching.service';
import { config } from '../config';
import { createLogger } from '../utils/logger';
import { GrantRecommendationRequest } from '../types/recommendation';

const logger = createLogger('recommendation.service');

export class RecommendationService {
  private readonly llmService: LLMService;
  private readonly matchingService: MatchingService;
  private readonly redis: Redis;

  constructor() {
    this.llmService = new LLMService();
    this.matchingService = new MatchingService(this.llmService);
    this.redis = new Redis(config.redis.url);
  }

  async getRecommendationsForUser(request: GrantRecommendationRequest): Promise<IGrant[]> {
    try {
      // Check cache first
      const cachedRecommendations = await this.getCachedRecommendations(request.userId);
      if (cachedRecommendations) {
        return cachedRecommendations;
      }

      // Find matching grants based on preferences and profile
      const matchingGrants = await this.matchingService.findMatchingGrants(
        request.preferences,
        request.profile
      );

      // Cache the results
      await this.cacheRecommendations(request.userId, matchingGrants);

      return matchingGrants;
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      throw error;
    }
  }

  async getCachedRecommendations(userId: string): Promise<IGrant[] | null> {
    try {
      const cached = await this.redis.get(`recommendations:${userId}`);
      return cached ? JSON.parse(cached) as IGrant[] : null;
    } catch (error) {
      logger.error('Error getting cached recommendations:', error);
      return null;
    }
  }

  async cacheRecommendations(userId: string, recommendations: IGrant[]): Promise<void> {
    try {
      await this.redis.setex(
        `recommendations:${userId}`,
        config.redis.recommendationTTL,
        JSON.stringify(recommendations)
      );
    } catch (error) {
      logger.error('Error caching recommendations:', error);
    }
  }
}

export const recommendationService = new RecommendationService();
