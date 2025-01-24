import { IGrant } from '../models/schema';
import { LLMService } from './llm.service';
import { calculateSimilarity } from '../utils/similarity';
import { createLogger } from '../utils/logger';
import { GrantRecommendationRequest } from '../types/recommendation';

const logger = createLogger('matching.service');

interface ScoredGrant {
  grant: IGrant;
  score: number;
}

export class MatchingService {
  private readonly llmService: LLMService;

  constructor(llmService: LLMService) {
    this.llmService = llmService;
  }

  async findMatchingGrants(
    preferences?: GrantRecommendationRequest['preferences'],
    profile?: GrantRecommendationRequest['profile']
  ): Promise<IGrant[]> {
    try {
      // Get all available grants
      const grants = await this.getAllGrants();
      logger.info('Retrieved grants for matching', { count: grants.length });

      // Filter grants based on preferences
      const filteredGrants = preferences ? 
        this.filterGrantsByPreferences(grants, preferences) : 
        grants;

      // Score each grant
      const scoredGrants: Promise<ScoredGrant>[] = filteredGrants.map(async (grant) => ({
        grant,
        score: await this.calculateGrantScore(grant, preferences, profile)
      }));

      // Wait for all scores and sort
      const resolvedGrants = await Promise.all(scoredGrants);

      // Sort by score and return top matches
      return resolvedGrants
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(match => match.grant);

    } catch (error) {
      logger.error('Error finding matching grants:', error);
      throw new Error('Failed to find matching grants');
    }
  }

  private filterGrantsByPreferences(grants: IGrant[], preferences: NonNullable<GrantRecommendationRequest['preferences']>): IGrant[] {
    return grants.filter(grant => {
      // Filter by categories
      if (preferences.categories?.length && 
          !grant.categories.some(cat => preferences.categories?.includes(cat))) {
        return false;
      }

      // Filter by funding amount
      if (preferences.fundingAmount) {
        const { min, max } = preferences.fundingAmount;
        if ((min && grant.amount.max < min) || (max && grant.amount.min > max)) {
          return false;
        }
      }

      // Filter by location
      if (preferences.location?.length &&
          !grant.eligibility.locations?.some(loc => preferences.location?.includes(loc))) {
        return false;
      }

      return true;
    });
  }

  private async calculateGrantScore(
    grant: IGrant, 
    preferences?: GrantRecommendationRequest['preferences'],
    profile?: GrantRecommendationRequest['profile']
  ): Promise<number> {
    const scores: number[] = [];

    // Category match score
    if (preferences?.categories?.length) {
      const categoryScore = calculateSimilarity(
        grant.categories,
        preferences.categories
      );
      scores.push(categoryScore);
    }

    // Amount match score
    if (preferences?.fundingAmount) {
      const { min, max } = preferences.fundingAmount;
      const amountScore = (min && max) ?
        (grant.amount.min >= min && grant.amount.max <= max ? 1 : 0) :
        1;
      scores.push(amountScore);
    }

    // Location match score
    if (preferences?.location?.length && grant.eligibility.locations) {
      const locationScore = calculateSimilarity(
        grant.eligibility.locations,
        preferences.location
      );
      scores.push(locationScore);
    }

    // Keywords match score
    if (preferences?.keywords?.length) {
      const keywordsScore = calculateSimilarity(
        [...grant.categories, ...grant.objectives],
        preferences.keywords
      );
      scores.push(keywordsScore);
    }

    // Profile match score
    if (profile) {
      const { score } = await this.llmService.scoreGrantMatch(grant, profile);
      scores.push(score);
    }

    // Return average score
    return scores.length ? 
      scores.reduce((sum, score) => sum + score, 0) / scores.length :
      1;
  }

  private async getAllGrants(): Promise<IGrant[]> {
    // TODO: Implement grant retrieval from database
    // For now, return an empty array as a placeholder
    return [];
  }
}
