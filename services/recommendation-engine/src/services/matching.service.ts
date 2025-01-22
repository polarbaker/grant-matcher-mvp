import { OpenAIEmbeddings } from '@langchain/openai';
import { Redis } from 'ioredis';
import { 
  Grant, 
  Organization, 
  MatchingProfile,
  IGrant,
  IOrganization,
  IMatchingProfile,
  GrantCategory
} from '../models/schema';
import { createLogger } from '../utils/logger';
import config from '../config';

export class MatchingService {
  private readonly embeddings: OpenAIEmbeddings;
  private readonly redis: Redis;
  private readonly logger = createLogger('MatchingService');
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.openai.apiKey,
      modelName: 'text-embedding-3-small'
    });
    this.redis = new Redis(config.redis);
  }

  /**
   * Calculate semantic similarity between two texts using embeddings
   */
  private async calculateSimilarity(text1: string, text2: string): Promise<number> {
    const [embedding1, embedding2] = await Promise.all([
      this.embeddings.embedQuery(text1),
      this.embeddings.embedQuery(text2)
    ]);

    return this.cosineSimilarity(embedding1, embedding2);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    const dotProduct = vec1.reduce((acc, val, i) => acc + val * vec2[i], 0);
    const mag1 = Math.sqrt(vec1.reduce((acc, val) => acc + val * val, 0));
    const mag2 = Math.sqrt(vec2.reduce((acc, val) => acc + val * val, 0));
    return dotProduct / (mag1 * mag2);
  }

  /**
   * Calculate match between grant amount and organization preferences
   */
  private calculateAmountMatch(
    grantAmount: { min: number; max: number },
    orgPreferences: { min?: number; max?: number }
  ): number {
    if (!orgPreferences.min && !orgPreferences.max) return 1.0;

    const grantMean = (grantAmount.min + grantAmount.max) / 2;
    const prefMean = orgPreferences.min && orgPreferences.max
      ? (orgPreferences.min + orgPreferences.max) / 2
      : orgPreferences.min || orgPreferences.max || grantMean;

    // Calculate how close the grant amount is to the preferred amount
    const distance = Math.abs(grantMean - prefMean);
    const maxDistance = Math.max(grantMean, prefMean);
    return Math.max(0, 1 - (distance / maxDistance));
  }

  /**
   * Calculate category match score
   */
  private calculateCategoryMatch(
    grantCategories: GrantCategory[],
    orgCategories: GrantCategory[]
  ): number {
    if (!orgCategories.length || !grantCategories.length) return 0;

    const intersection = grantCategories.filter(cat => orgCategories.includes(cat));
    return intersection.length / Math.max(grantCategories.length, orgCategories.length);
  }

  /**
   * Calculate location match score
   */
  private calculateLocationMatch(
    grantRegions: string[],
    orgRegions: string[]
  ): number {
    if (!grantRegions.length || !orgRegions.length) return 1.0;

    const normalizedGrantRegions = grantRegions.map(r => r.toLowerCase());
    const normalizedOrgRegions = orgRegions.map(r => r.toLowerCase());

    const intersection = normalizedGrantRegions.filter(r => normalizedOrgRegions.includes(r));
    return intersection.length / Math.max(normalizedGrantRegions.length, normalizedOrgRegions.length);
  }

  /**
   * Calculate requirements match score using semantic similarity
   */
  private async calculateRequirementsMatch(
    grantRequirements: string[],
    orgExpertise: string[]
  ): Promise<number> {
    if (!grantRequirements.length || !orgExpertise.length) return 1.0;

    const grantText = grantRequirements.join(' ');
    const orgText = orgExpertise.join(' ');
    
    return await this.calculateSimilarity(grantText, orgText);
  }

  /**
   * Calculate timeline match score
   */
  private calculateTimelineMatch(
    grantTimeline: { start?: Date; end?: Date },
    orgPreferences: { earliestStartDate?: Date; latestEndDate?: Date }
  ): number {
    if (!grantTimeline.start || !grantTimeline.end || 
        !orgPreferences.earliestStartDate || !orgPreferences.latestEndDate) {
      return 1.0;
    }

    const grantStart = new Date(grantTimeline.start).getTime();
    const grantEnd = new Date(grantTimeline.end).getTime();
    const prefStart = new Date(orgPreferences.earliestStartDate).getTime();
    const prefEnd = new Date(orgPreferences.latestEndDate).getTime();

    // Check if timelines overlap
    if (grantEnd < prefStart || grantStart > prefEnd) return 0;

    // Calculate overlap percentage
    const overlapStart = Math.max(grantStart, prefStart);
    const overlapEnd = Math.min(grantEnd, prefEnd);
    const overlap = overlapEnd - overlapStart;
    const totalDuration = Math.max(grantEnd, prefEnd) - Math.min(grantStart, prefStart);

    return overlap / totalDuration;
  }

  /**
   * Generate embeddings for grant and organization content
   */
  public async generateEmbeddings(
    grant: IGrant | IOrganization
  ): Promise<void> {
    try {
      if ('title' in grant) {
        // Grant embeddings
        const titleEmbed = await this.embeddings.embedQuery(grant.title);
        const descEmbed = await this.embeddings.embedQuery(grant.description);
        
        grant.titleEmbedding = titleEmbed;
        grant.descriptionEmbedding = descEmbed;
      } else {
        // Organization embeddings
        const missionEmbed = await this.embeddings.embedQuery(grant.mission);
        const expertiseEmbed = await this.embeddings.embedQuery(grant.expertise.join(' '));
        
        grant.missionEmbedding = missionEmbed;
        grant.expertiseEmbedding = expertiseEmbed;
      }

      await grant.save();
    } catch (error) {
      this.logger.error('Error generating embeddings:', error);
      throw error;
    }
  }

  /**
   * Calculate overall match score between a grant and an organization
   */
  public async calculateMatchScore(
    grant: IGrant,
    organization: IOrganization,
    profile: IMatchingProfile
  ): Promise<number> {
    const cacheKey = `match:${grant._id}:${organization._id}`;
    
    // Check cache first
    const cachedScore = await this.redis.get(cacheKey);
    if (cachedScore) return parseFloat(cachedScore);

    try {
      const scores = await Promise.all([
        // Category match
        Promise.resolve(this.calculateCategoryMatch(
          grant.categories,
          profile.preferences.categories
        )),

        // Amount match
        Promise.resolve(this.calculateAmountMatch(
          grant.amount,
          profile.preferences.grantSize
        )),

        // Location match
        Promise.resolve(this.calculateLocationMatch(
          grant.eligibility.regions,
          profile.preferences.regions
        )),

        // Requirements match
        this.calculateRequirementsMatch(
          grant.requirements,
          organization.expertise
        ),

        // Timeline match
        Promise.resolve(this.calculateTimelineMatch(
          {
            start: grant.timeline.projectStart,
            end: grant.timeline.projectEnd
          },
          profile.preferences.timeline
        )),

        // Mission alignment (semantic similarity)
        this.calculateSimilarity(
          grant.description,
          organization.mission
        )
      ]);

      // Apply weights from matching profile
      const weightedScores = [
        scores[0] * profile.weights.categoryMatch,
        scores[1] * profile.weights.amountMatch,
        scores[2] * profile.weights.locationMatch,
        scores[3] * profile.weights.requirementsMatch,
        scores[4] * profile.weights.timelineMatch,
        scores[5] // Mission alignment always has weight 1.0
      ];

      // Calculate final score
      const totalWeight = Object.values(profile.weights).reduce((a, b) => a + b, 1);
      const finalScore = weightedScores.reduce((a, b) => a + b, 0) / totalWeight;

      // Apply custom scoring rules
      const adjustedScore = this.applyCustomScoringRules(
        finalScore,
        grant,
        organization,
        profile
      );

      // Cache the result
      await this.redis.setex(cacheKey, this.CACHE_TTL, adjustedScore.toString());

      return adjustedScore;
    } catch (error) {
      this.logger.error('Error calculating match score:', error);
      throw error;
    }
  }

  /**
   * Apply custom scoring rules defined in the matching profile
   */
  private applyCustomScoringRules(
    baseScore: number,
    grant: IGrant,
    organization: IOrganization,
    profile: IMatchingProfile
  ): number {
    let adjustedScore = baseScore;

    if (profile.customScoring?.rules) {
      for (const rule of profile.customScoring.rules) {
        try {
          // Evaluate rule condition using Function constructor
          const condition = new Function(
            'grant',
            'organization',
            'score',
            `return ${rule.condition};`
          );

          if (condition(grant, organization, adjustedScore)) {
            adjustedScore = adjustedScore * (1 + rule.score * rule.weight);
          }
        } catch (error) {
          this.logger.error('Error applying custom scoring rule:', error);
        }
      }
    }

    // Ensure score stays between 0 and 1
    return Math.max(0, Math.min(1, adjustedScore));
  }

  /**
   * Find matching grants for an organization
   */
  public async findMatches(
    organizationId: string,
    options: {
      minScore?: number;
      limit?: number;
      offset?: number;
      categories?: GrantCategory[];
      maxAmount?: number;
      deadline?: Date;
    } = {}
  ): Promise<Array<{ grant: IGrant; score: number }>> {
    const {
      minScore = 0.6,
      limit = 10,
      offset = 0,
      categories,
      maxAmount,
      deadline
    } = options;

    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      const profile = await MatchingProfile.findOne({ organization: organizationId });
      if (!profile) {
        throw new Error('Matching profile not found');
      }

      // Build grant query
      const query: any = {
        status: 'open',
        'timeline.applicationDeadline': { $gt: new Date() }
      };

      if (categories?.length) {
        query.categories = { $in: categories };
      }

      if (maxAmount) {
        query['amount.max'] = { $lte: maxAmount };
      }

      if (deadline) {
        query['timeline.applicationDeadline'] = { $lte: deadline };
      }

      // Get grants and calculate scores
      const grants = await Grant.find(query);
      const matchPromises = grants.map(async grant => ({
        grant,
        score: await this.calculateMatchScore(grant, organization, profile)
      }));

      const matches = await Promise.all(matchPromises);

      // Filter and sort by score
      return matches
        .filter(match => match.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(offset, offset + limit);

    } catch (error) {
      this.logger.error('Error finding matches:', error);
      throw error;
    }
  }

  /**
   * Get grant recommendations based on collaborative filtering
   */
  public async getRecommendations(
    organizationId: string,
    limit: number = 5
  ): Promise<IGrant[]> {
    try {
      const organization = await Organization.findById(organizationId);
      if (!organization) {
        throw new Error('Organization not found');
      }

      // Find similar organizations based on focus areas and previous grants
      const similarOrgs = await Organization.find({
        _id: { $ne: organizationId },
        focusAreas: { $in: organization.focusAreas }
      }).limit(10);

      // Get grants that similar organizations have applied to or won
      const recommendedGrants = await Grant.find({
        status: 'open',
        categories: { $in: organization.focusAreas },
        'timeline.applicationDeadline': { $gt: new Date() }
      })
      .sort('-successRate')
      .limit(limit);

      return recommendedGrants;

    } catch (error) {
      this.logger.error('Error getting recommendations:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    await this.redis.quit();
  }
}
