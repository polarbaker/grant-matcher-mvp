import { Grant } from '../models/Grant';
import { Recommendation } from '../models/Recommendation';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { DeckAnalyzerService } from './deck-analyzer.service';
import { llmService } from './llm.service';
import { cacheService } from './cache.service';
import { GrantRecommendationRequest } from '../../../shared/types/recommendation';

class RecommendationService {
  private deckAnalyzer: DeckAnalyzerService;
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor() {
    this.deckAnalyzer = new DeckAnalyzerService();
  }

  async getRecommendationsForUser(request: GrantRecommendationRequest) {
    try {
      const { userId, preferences, profile, page = 1, limit = 10 } = request;

      // Check cache first
      const cacheKey = `recommendations:${userId}:${page}:${limit}`;
      const cachedRecommendations = await cacheService.get(cacheKey);
      
      if (cachedRecommendations) {
        logger.info('Using cached recommendations for user');
        return cachedRecommendations;
      }

      // Get existing recommendations or generate new ones
      let recommendations = await Recommendation.find({ userId })
        .sort({ matchScore: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      if (recommendations.length === 0) {
        recommendations = await this.generateRecommendations(userId, preferences, profile);
      }

      const total = await Recommendation.countDocuments({ userId });
      const response = {
        recommendations,
        total,
        page,
        hasMore: total > page * limit
      };

      // Cache the results
      await cacheService.set(cacheKey, response, this.CACHE_TTL);
      
      return response;
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      throw new AppError(500, 'Failed to get recommendations');
    }
  }

  async generateRecommendations(userId: string, preferences?: any, profile?: any) {
    try {
      // Get all available grants
      const grants = await Grant.find({});
      logger.info('Found grants to process', { count: grants.length });
      
      // Use LLM to score and match grants
      const scoredGrants = await Promise.all(
        grants.map(async (grant) => {
          logger.info('Processing grant', { 
            grantId: grant._id,
            title: grant.title,
            hasPreferences: !!preferences,
            hasProfile: !!profile
          });
          const matchData = await llmService.scoreGrantMatch(grant, preferences, profile);
          logger.info('Grant scored', {
            grantId: grant._id,
            title: grant.title,
            score: matchData.score,
            reasons: matchData.reasons
          });
          
          return new Recommendation({
            userId,
            grantId: grant._id,
            title: grant.title,
            description: grant.description,
            amount: grant.amount?.max || grant.amount?.min || grant.amount,
            deadline: grant.deadline,
            matchScore: matchData.score,
            matchReasons: matchData.reasons,
            source: grant.source,
            url: grant.url
          });
        })
      );

      // Sort by match score and save
      const sortedGrants = scoredGrants.sort((a, b) => b.matchScore - a.matchScore);
      await Recommendation.insertMany(sortedGrants);
      logger.info('Recommendations generated and saved', { 
        count: sortedGrants.length,
        userId,
        topScore: sortedGrants[0]?.matchScore
      });

      return sortedGrants;
    } catch (error) {
      logger.error('Error generating recommendations:', {
        error: error instanceof Error ? error.message : error,
        userId,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new AppError(500, 'Failed to generate recommendations');
    }
  }

  async refreshRecommendations(userId: string) {
    try {
      // Delete existing recommendations
      await Recommendation.deleteMany({ userId });
      
      // Clear cache
      const cachePattern = `recommendations:${userId}:*`;
      await cacheService.delPattern(cachePattern);
      
      // New recommendations will be generated on next request
      logger.info(`Recommendations refreshed for user ${userId}`);
    } catch (error) {
      logger.error('Error refreshing recommendations:', error);
      throw new AppError(500, 'Failed to refresh recommendations');
    }
  }

  async analyzeDeck(file: Express.Multer.File) {
    try {
      const cacheKey = `deck:${file.originalname}:${file.size}`;
      const cachedAnalysis = await cacheService.get(cacheKey);
      
      if (cachedAnalysis) {
        logger.info('Using cached deck analysis');
        return cachedAnalysis;
      }

      const analysis = await this.deckAnalyzer.analyze(file);
      await cacheService.set(cacheKey, analysis, this.CACHE_TTL);
      
      return analysis;
    } catch (error) {
      logger.error('Error analyzing deck:', error);
      throw new AppError(500, 'Failed to analyze deck');
    }
  }
}

export const recommendationService = new RecommendationService();
