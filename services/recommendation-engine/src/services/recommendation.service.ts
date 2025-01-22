import { Grant, IGrant } from '../models/Grant';
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
  grant: IGrant;
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

interface FeedbackData {
  userId: string;
  rating: number;
  comment?: string;
  status: 'interested' | 'not_interested' | 'applied';
}

export class RecommendationService {
  static async getRecommendations(
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

      // Get all active grants
      const grants = await Grant.find(query);

      // Calculate match scores
      const recommendations = grants.map((grant: IGrant) => {
        const score = this.calculateMatchScore(grant, deckAnalysis);
        const matchReason = this.generateMatchReason(grant, deckAnalysis);

        return {
          grant,
          score,
          matchReason,
        };
      });

      // Sort by score and return top matches
      return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    } catch (error) {
      logger.error('Error getting recommendations:', error);
      throw error;
    }
  }

  static async getRecommendationById(id: string): Promise<IGrant | null> {
    try {
      return await Grant.findById(id);
    } catch (error) {
      logger.error('Error getting recommendation by ID:', error);
      throw error;
    }
  }

  static async updateFeedback(id: string, feedback: FeedbackData): Promise<IGrant> {
    try {
      const grant = await Grant.findById(id);

      if (!grant) {
        throw new Error('Grant not found');
      }

      // Add feedback to the grant's feedback array
      if (!grant.feedback) {
        grant.feedback = [];
      }

      grant.feedback.push({
        ...feedback,
        timestamp: new Date(),
      });

      // Update grant status based on feedback
      if (feedback.status === 'applied') {
        grant.applicationCount = (grant.applicationCount || 0) + 1;
      }

      await grant.save();
      return grant;
    } catch (error) {
      logger.error('Error updating feedback:', error);
      throw error;
    }
  }

  private static calculateMatchScore(grant: IGrant, deckAnalysis: DeckAnalysis): number {
    let score = 0;

    // Match categories with key topics and technologies
    const grantTerms = grant.categories.map((c: string) => c.toLowerCase());
    const deckTerms = [
      ...deckAnalysis.key_topics,
      ...deckAnalysis.entities.technologies.map((t: string) => t.toLowerCase())
    ];

    // Calculate term overlap
    const matchingTerms = grantTerms.filter((term: string) => 
      deckTerms.some((deckTerm: string) => deckTerm.includes(term.toLowerCase()))
    );

    score += (matchingTerms.length / grantTerms.length) * 100;

    // Bonus points for market alignment
    const marketMatch = grant.eligibility.regions.some((region: string) =>
      region === "Global" || deckAnalysis.entities.markets.includes(region)
    );
    if (marketMatch) score += 20;

    // Cap the score at 100
    return Math.min(score, 100);
  }

  private static generateMatchReason(grant: IGrant, deckAnalysis: DeckAnalysis): string {
    const matchingCategories = grant.categories.filter((category: string) =>
      deckAnalysis.key_topics.some((topic: string) => 
        topic.toLowerCase().includes(category.toLowerCase())
      )
    );

    if (matchingCategories.length > 0) {
      return `This grant aligns with your focus on ${matchingCategories.join(', ')}`;
    }

    return 'This grant matches your organization profile';
  }
}
