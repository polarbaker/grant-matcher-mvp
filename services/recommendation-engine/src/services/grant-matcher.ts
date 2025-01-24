import { IGrant } from '../models/schema';
import { createLogger } from '../utils/logger';
import { calculateSimilarity } from '../utils/similarity';

const logger = createLogger('grant-matcher');

interface DeckAnalysis {
  summary: string;
  entities: {
    technologies: string[];
    markets: string[];
  };
  key_topics: string[];
}

interface GrantMatch {
  grant: IGrant;
  score: number;
  matchReason: string;
}

interface GrantFilters {
  minAmount?: number;
  maxAmount?: number;
  categories?: string[];
  deadline?: Date;
}

export class GrantMatcher {
  async findMatchingGrants(
    deckAnalysis: DeckAnalysis,
    filters?: GrantFilters,
    grants: IGrant[] = []
  ): Promise<GrantMatch[]> {
    try {
      // Filter grants based on criteria
      const filteredGrants = this.filterGrants(grants, filters);

      // Calculate similarity scores for each grant
      const matches = filteredGrants.map(grant => {
        // Combine grant information for matching
        const grantText = [
          grant.title,
          grant.description,
          ...grant.categories,
        ].join(' ');

        // Combine deck analysis information
        const deckText = [
          deckAnalysis.summary,
          ...deckAnalysis.entities.technologies,
          ...deckAnalysis.entities.markets,
          ...deckAnalysis.key_topics,
        ].join(' ');

        const score = calculateSimilarity([grantText], [deckText]);

        // Generate match reason
        const matchReason = this.generateMatchReason(grant, deckAnalysis);

        return {
          grant,
          score,
          matchReason,
        };
      });

      // Sort by similarity score
      return matches.sort((a: GrantMatch, b: GrantMatch) => b.score - a.score);
    } catch (error) {
      logger.error('Error finding matching grants:', error);
      return [];
    }
  }

  private filterGrants(grants: IGrant[], filters?: GrantFilters): IGrant[] {
    if (!filters) return grants;

    return grants.filter(grant => {
      // Filter by amount
      if (filters.minAmount && (!grant.amount.max || grant.amount.max < filters.minAmount)) {
        return false;
      }
      if (filters.maxAmount && (!grant.amount.min || grant.amount.min > filters.maxAmount)) {
        return false;
      }

      // Filter by categories
      if (filters.categories?.length && 
          !grant.categories.some(cat => filters.categories?.includes(cat))) {
        return false;
      }

      // Filter by deadline
      if (filters.deadline && grant.deadline && new Date(grant.deadline) < filters.deadline) {
        return false;
      }

      return true;
    });
  }

  matchGrantToPreferences(grant: IGrant, preferences: string[]): number {
    try {
      // Calculate similarity between grant categories and preferences
      const similarityScore = calculateSimilarity(grant.categories, preferences);
      return similarityScore;
    } catch (error) {
      logger.error('Error matching grant to preferences:', error);
      return 0;
    }
  }

  private generateMatchReason(grant: IGrant, deckAnalysis: DeckAnalysis): string {
    const reasons: string[] = [];

    // Check for matching technologies
    const matchingTechnologies = grant.categories.filter(category =>
      deckAnalysis.entities.technologies.includes(category)
    );
    if (matchingTechnologies.length > 0) {
      reasons.push(
        `Matches your focus on ${matchingTechnologies.join(', ')}`
      );
    }

    // Check for matching markets
    const matchingMarkets = grant.categories.filter(category =>
      deckAnalysis.entities.markets.includes(category)
    );
    if (matchingMarkets.length > 0) {
      reasons.push(
        `Aligns with your target market: ${matchingMarkets.join(', ')}`
      );
    }

    // If no specific matches found, provide a general reason
    if (reasons.length === 0) {
      reasons.push('Matches based on overall project description');
    }

    return reasons.join('. ');
  }
}
