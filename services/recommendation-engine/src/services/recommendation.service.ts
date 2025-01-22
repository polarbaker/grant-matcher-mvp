import { Grant } from '../models/Grant';
import { calculateSimilarity } from '../utils/similarity';
import { logger } from '../utils/logger';

interface DeckAnalysis {
  summary: string;
  entities: {
    organizations: string[];
    technologies: string[];
    markets: string[];
  };
  key_topics: string[];
}

interface RecommendationResult {
  grant: any;
  score: number;
  matchReason: string;
}

interface RecommendationFilters {
  minAmount?: number;
  maxAmount?: number;
  categories?: string[];
  regions?: string[];
  organizationTypes?: string[];
}

export class RecommendationService {
  async getRecommendations(
    deckAnalysis: DeckAnalysis,
    filters?: RecommendationFilters
  ): Promise<RecommendationResult[]> {
    try {
      // Build query for filters
      const query: Record<string, any> = { status: 'active' };

      if (filters) {
        if (filters.minAmount) {
          query['amount.min'] = { $gte: filters.minAmount };
        }
        if (filters.maxAmount) {
          query['amount.max'] = { $lte: filters.maxAmount };
        }
        if (filters.categories?.length) {
          query.categories = { $in: filters.categories };
        }
        if (filters.regions?.length) {
          query['eligibility.regions'] = { $in: filters.regions };
        }
        if (filters.organizationTypes?.length) {
          query['eligibility.organizationTypes'] = { $in: filters.organizationTypes };
        }
      }

      logger.info('Finding grants with query:', query);

      // Get all active grants that match the filters
      const grants = await Grant.find(query);

      logger.info(`Found ${grants.length} grants matching filters`);

      // Calculate similarity scores for each grant
      const recommendations = grants.map(grant => {
        // Combine grant information for matching
        const grantText = [
          grant.title,
          grant.description,
          ...grant.categories,
          ...(grant.eligibility?.requirements || []),
        ].join(' ');

        // Combine deck analysis information
        const deckText = [
          deckAnalysis.summary,
          ...deckAnalysis.entities.technologies,
          ...deckAnalysis.entities.markets,
          ...deckAnalysis.key_topics.map((t: string) => t.toLowerCase()),
        ].join(' ');

        const score = calculateSimilarity(grantText, deckText);

        // Generate match reason
        const matchReason = this.generateMatchReason(grant, deckAnalysis);

        return {
          grant,
          score,
          matchReason,
        };
      });

      // Sort by similarity score
      return recommendations.sort((a, b) => b.score - a.score);
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      throw error;
    }
  }

  private generateMatchReason(grant: any, deckAnalysis: DeckAnalysis): string {
    const reasons: string[] = [];

    // Check for matching technologies
    const matchingTechnologies = deckAnalysis.entities.technologies.filter(tech =>
      grant.categories.includes(tech)
    );
    if (matchingTechnologies.length > 0) {
      reasons.push(
        `Matches your focus on ${matchingTechnologies.join(', ')}`
      );
    }

    // Check for matching markets
    const matchingMarkets = deckAnalysis.entities.markets.filter(market =>
      grant.categories.includes(market)
    );
    if (matchingMarkets.length > 0) {
      reasons.push(
        `Aligns with your target market: ${matchingMarkets.join(', ')}`
      );
    }

    // Check for key topic matches
    const matchingTopics = deckAnalysis.key_topics.some((topic: string) =>
      grant.description.toLowerCase().includes(topic.toLowerCase())
    );
    if (matchingTopics) {
      reasons.push('Matches key topics in your pitch deck');
    }

    // If no specific matches found, provide a general reason
    if (reasons.length === 0) {
      reasons.push('Matches based on overall project description');
    }

    return reasons.join('. ');
  }
}
