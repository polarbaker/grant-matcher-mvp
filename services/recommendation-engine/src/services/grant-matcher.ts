import { Grant } from '../models/Grant';
import { calculateSimilarity } from '../utils/similarity';

interface DeckAnalysis {
  summary: string;
  entities: {
    organizations: string[];
    technologies: string[];
    markets: string[];
  };
  key_topics: string[];
}

interface GrantMatch {
  grant: any;
  score: number;
  matchReason: string;
}

interface GrantFilters {
  minAmount?: number;
  maxAmount?: number;
  categories?: string[];
  deadline?: Date;
}

export async function findMatchingGrants(
  deckAnalysis: DeckAnalysis,
  filters?: GrantFilters
): Promise<GrantMatch[]> {
  // Build query for filters
  const query: Record<string, any> = { status: 'active' };
  
  if (filters) {
    if (filters.minAmount) {
      query['amount.max'] = { $gte: filters.minAmount };
    }
    if (filters.maxAmount) {
      query['amount.min'] = { $lte: filters.maxAmount };
    }
    if (filters.categories?.length) {
      query.categories = { $in: filters.categories };
    }
    if (filters.deadline) {
      query.deadline = { $gte: filters.deadline };
    }
  }

  // Get all active grants that match the filters
  const grants = await Grant.find(query);

  // Calculate similarity scores for each grant
  const matches = grants.map(grant => {
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

    const score = calculateSimilarity(grantText, deckText);

    // Generate match reason
    const matchReason = generateMatchReason(grant, deckAnalysis);

    return {
      grant,
      score,
      matchReason,
    };
  });

  // Sort by similarity score
  return matches.sort((a, b) => b.score - a.score);
}

function generateMatchReason(grant: any, deckAnalysis: DeckAnalysis): string {
  const reasons: string[] = [];

  // Check for matching technologies
  const matchingTechnologies = grant.categories.filter((category: string) =>
    deckAnalysis.entities.technologies.includes(category)
  );
  if (matchingTechnologies.length > 0) {
    reasons.push(
      `Matches your focus on ${matchingTechnologies.join(', ')}`
    );
  }

  // Check for matching markets
  const matchingMarkets = grant.categories.filter((category: string) =>
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
