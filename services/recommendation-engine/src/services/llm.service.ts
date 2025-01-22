import { OpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { LLMChain, RetrievalQAChain, ConversationChain } from 'langchain/chains';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { Document } from 'langchain/document';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { BufferMemory } from 'langchain/memory';
import { BaseCache } from 'langchain/schema';
import { Redis } from 'ioredis';
import { z } from 'zod';
import { createLogger } from '../utils/logger';
import config from '../config';
import { IGrant, IOrganization } from '../models/schema';
import { retry } from '../utils/retry';
import { RateLimiter } from '../utils/rate-limiter';
import { performance } from 'perf_hooks';

// Validation schemas
const GrantInfoSchema = z.object({
  objectives: z.array(z.string()),
  requirements: z.array(z.string()),
  timeline: z.object({
    dates: z.array(z.string()),
    deadlines: z.array(z.string())
  }),
  keywords: z.array(z.string()),
  targetAudience: z.string(),
  fundingPriorities: z.array(z.string())
});

class RedisCache implements BaseCache {
  private redis: Redis;
  private ttl: number;

  constructor(redis: Redis, ttl: number = 3600) {
    this.redis = redis;
    this.ttl = ttl;
  }

  async lookup(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  async update(key: string, value: string): Promise<void> {
    await this.redis.setex(key, this.ttl, value);
  }
}

export class LLMService {
  private readonly llm: OpenAI;
  private readonly embeddings: OpenAIEmbeddings;
  private readonly logger = createLogger('LLMService');
  private readonly redis: Redis;
  private readonly cache: RedisCache;
  private readonly rateLimiter: RateLimiter;
  private vectorStore: MemoryVectorStore | null = null;
  private readonly CACHE_TTL = 3600;
  private readonly MAX_RETRIES = 3;
  private readonly BATCH_SIZE = 5;

  constructor() {
    this.redis = new Redis(config.redis);
    this.cache = new RedisCache(this.redis);
    this.rateLimiter = new RateLimiter({
      maxRequests: 50,
      timeWindow: 60000
    });

    this.llm = new OpenAI({
      openAIApiKey: config.openai.apiKey,
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.7,
      cache: this.cache,
      maxRetries: this.MAX_RETRIES,
      maxConcurrency: 5
    });

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.openai.apiKey,
      modelName: 'text-embedding-3-small',
      cache: this.cache,
      maxRetries: this.MAX_RETRIES
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.cleanup());
    process.on('SIGINT', () => this.cleanup());
  }

  /**
   * Initialize vector store with grant documents
   */
  public async initializeVectorStore(grants: IGrant[]): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Process grants in batches
      const batches = this.chunkArray(grants, this.BATCH_SIZE);
      const documents: Document[] = [];

      for (const batch of batches) {
        const batchDocs = await Promise.all(batch.map(async grant => {
          await this.rateLimiter.waitForToken();
          return new Document({
            pageContent: `${grant.title}\n${grant.description}\n${grant.objectives.join('\n')}`,
            metadata: {
              grantId: grant._id.toString(),
              categories: grant.categories,
              amount: grant.amount,
              deadline: grant.timeline.applicationDeadline,
              lastUpdated: grant.lastUpdatedAt
            }
          });
        }));
        documents.push(...batchDocs);
      }

      this.vectorStore = await MemoryVectorStore.fromDocuments(
        documents,
        this.embeddings
      );

      const duration = performance.now() - startTime;
      this.logger.info(`Initialized vector store with ${grants.length} grants in ${duration}ms`);
    } catch (error) {
      this.logger.error('Error initializing vector store:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Extract structured information from grant description with validation
   */
  public async extractGrantInfo(description: string): Promise<z.infer<typeof GrantInfoSchema>> {
    const cacheKey = `grant_info:${Buffer.from(description).toString('base64')}`;
    
    try {
      // Check cache first
      const cached = await this.cache.lookup(cacheKey);
      if (cached) {
        return GrantInfoSchema.parse(JSON.parse(cached));
      }

      await this.rateLimiter.waitForToken();

      const parser = StructuredOutputParser.fromZodSchema(GrantInfoSchema);
      const formatInstructions = parser.getFormatInstructions();

      const prompt = new PromptTemplate({
        template: `Extract structured information from the following grant description.
        Be precise and thorough in your extraction.
        {format_instructions}
        Grant Description: {description}`,
        inputVariables: ["description"],
        partialVariables: { format_instructions: formatInstructions }
      });

      const chain = new LLMChain({ llm: this.llm, prompt });

      const response = await retry(
        async () => {
          const result = await chain.call({ description });
          return parser.parse(result.text);
        },
        {
          maxRetries: this.MAX_RETRIES,
          onRetry: (error, attempt) => {
            this.logger.warn(`Retry attempt ${attempt} for extractGrantInfo:`, error);
          }
        }
      );

      // Cache the validated result
      await this.cache.update(cacheKey, JSON.stringify(response));
      return response;

    } catch (error) {
      this.logger.error('Error extracting grant info:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Generate grant summary with improved context
   */
  public async generateGrantSummary(grant: IGrant): Promise<string> {
    const cacheKey = `grant_summary:${grant._id}:${grant.lastUpdatedAt}`;
    
    try {
      const cached = await this.cache.lookup(cacheKey);
      if (cached) return cached;

      await this.rateLimiter.waitForToken();

      const prompt = new PromptTemplate({
        template: `Create a concise but comprehensive summary of the following grant opportunity.
        Focus on the key points that would be most relevant to potential applicants.
        
        Title: {title}
        Description: {description}
        Amount: {amount}
        Deadline: {deadline}
        Requirements: {requirements}
        Objectives: {objectives}
        
        Your summary should:
        1. Start with a clear overview
        2. Highlight key eligibility requirements
        3. Emphasize unique aspects or opportunities
        4. Include important dates and deadlines
        5. Mention any special considerations
        
        Keep the tone professional and informative.`,
        inputVariables: [
          "title", "description", "amount", "deadline",
          "requirements", "objectives"
        ]
      });

      const chain = new LLMChain({ llm: this.llm, prompt });

      const response = await retry(
        async () => {
          const result = await chain.call({
            title: grant.title,
            description: grant.description,
            amount: `${grant.amount.min} - ${grant.amount.max} ${grant.amount.currency}`,
            deadline: grant.timeline.applicationDeadline.toISOString(),
            requirements: grant.requirements.join('\n'),
            objectives: grant.objectives.join('\n')
          });
          return result.text;
        },
        { maxRetries: this.MAX_RETRIES }
      );

      await this.cache.update(cacheKey, response);
      return response;

    } catch (error) {
      this.logger.error('Error generating grant summary:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Answer questions about a grant using RAG with improved context handling
   */
  public async answerGrantQuestion(
    grantId: string,
    question: string,
    context?: string
  ): Promise<string> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    const cacheKey = `grant_qa:${grantId}:${question}:${context || ''}`;

    try {
      const cached = await this.cache.lookup(cacheKey);
      if (cached) return cached;

      await this.rateLimiter.waitForToken();

      const retriever = this.vectorStore.asRetriever({
        searchKwargs: { k: 3, filter: { grantId } }
      });

      const chain = RetrievalQAChain.fromLLM(
        this.llm,
        retriever,
        {
          returnSourceDocuments: true,
          verbose: true
        }
      );

      const response = await retry(
        async () => {
          const result = await chain.call({
            query: question,
            context: context || ''
          });
          return result.text;
        },
        { maxRetries: this.MAX_RETRIES }
      );

      await this.cache.update(cacheKey, response);
      return response;

    } catch (error) {
      this.logger.error('Error answering grant question:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Generate personalized grant recommendations with improved matching
   */
  public async generateRecommendations(
    organizationProfile: IOrganization,
    grants: IGrant[]
  ): Promise<Array<{ grant: IGrant; score: number; explanation: string }>> {
    const cacheKey = `recommendations:${organizationProfile._id}:${grants.map(g => g._id).join(':')}`;
    
    try {
      const cached = await this.cache.lookup(cacheKey);
      if (cached) return JSON.parse(cached);

      await this.rateLimiter.waitForToken();

      // Calculate embeddings for organization profile
      const orgEmbedding = await this.embeddings.embedQuery(
        `${organizationProfile.mission}\n${organizationProfile.expertise.join('\n')}`
      );

      // Process grants in parallel batches
      const batches = this.chunkArray(grants, this.BATCH_SIZE);
      const recommendations = [];

      for (const batch of batches) {
        const batchResults = await Promise.all(batch.map(async grant => {
          const grantEmbedding = await this.embeddings.embedQuery(
            `${grant.title}\n${grant.description}\n${grant.objectives.join('\n')}`
          );

          const similarity = this.cosineSimilarity(orgEmbedding, grantEmbedding);

          return {
            grant,
            score: similarity,
            explanation: await this.generateMatchExplanation(grant, organizationProfile)
          };
        }));

        recommendations.push(...batchResults);
      }

      // Sort by score and take top results
      const result = recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      await this.cache.update(cacheKey, JSON.stringify(result));
      return result;

    } catch (error) {
      this.logger.error('Error generating recommendations:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Generate explanation for grant match
   */
  private async generateMatchExplanation(
    grant: IGrant,
    organization: IOrganization
  ): Promise<string> {
    const prompt = new PromptTemplate({
      template: `Explain why this grant might be a good match for the organization:
      
      Grant:
      Title: {grantTitle}
      Description: {grantDescription}
      Requirements: {grantRequirements}
      
      Organization:
      Mission: {orgMission}
      Expertise: {orgExpertise}
      
      Provide a concise explanation focusing on:
      1. Mission alignment
      2. Expertise match
      3. Capacity to deliver
      4. Potential impact`,
      inputVariables: [
        "grantTitle", "grantDescription", "grantRequirements",
        "orgMission", "orgExpertise"
      ]
    });

    const chain = new LLMChain({ llm: this.llm, prompt });

    return retry(
      async () => {
        const result = await chain.call({
          grantTitle: grant.title,
          grantDescription: grant.description,
          grantRequirements: grant.requirements.join('\n'),
          orgMission: organization.mission,
          orgExpertise: organization.expertise.join('\n')
        });
        return result.text;
      },
      { maxRetries: this.MAX_RETRIES }
    );
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same length');
    }

    const dotProduct = vec1.reduce((acc, val, i) => acc + val * vec2[i], 0);
    const mag1 = Math.sqrt(vec1.reduce((acc, val) => acc + val * val, 0));
    const mag2 = Math.sqrt(vec2.reduce((acc, val) => acc + val * val, 0));

    return dotProduct / (mag1 * mag2);
  }

  /**
   * Split array into chunks for batch processing
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Handle errors with proper typing and logging
   */
  private handleError(error: unknown): Error {
    if (error instanceof z.ZodError) {
      return new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
    }
    if (error instanceof Error) {
      return error;
    }
    return new Error('An unknown error occurred');
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    try {
      await this.redis.quit();
      this.vectorStore = null;
      this.logger.info('Successfully cleaned up resources');
    } catch (error) {
      this.logger.error('Error during cleanup:', error);
    }
  }
}

export const llmService = new LLMService();
