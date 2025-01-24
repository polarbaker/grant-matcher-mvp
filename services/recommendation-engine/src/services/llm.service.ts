import OpenAI from 'openai';
import { IGrant } from '../models/schema';
import { config } from '../config';
import { createLogger } from '../utils/logger';
import { RateLimiter } from '../utils/rate-limiter';
import { AppError } from '../utils/errors';

const logger = createLogger('llm.service');

export class LLMService {
  private readonly openai: OpenAI;
  private readonly rateLimiter: RateLimiter;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey
    });
    this.rateLimiter = new RateLimiter();
  }

  async analyzeDeckContent(content: string): Promise<any> {
    try {
      // Check rate limit
      if (await this.rateLimiter.isRateLimited('analyze_deck')) {
        throw new AppError('Rate limit exceeded', 429);
      }

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert in analyzing pitch decks and grant applications.'
          },
          {
            role: 'user',
            content: `Please analyze this pitch deck content and extract key information: ${content}`
          }
        ]
      });

      return response.choices[0]?.message?.content;
    } catch (error) {
      logger.error('Error analyzing deck content:', error);
      throw error;
    }
  }

  async scoreGrantMatch(grant: IGrant, profile: any): Promise<{ score: number; reasons: string[] }> {
    try {
      // Check rate limit
      if (await this.rateLimiter.isRateLimited('score_grant')) {
        throw new AppError('Rate limit exceeded', 429);
      }

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert in matching grants to organizations.'
          },
          {
            role: 'user',
            content: `Please score how well this grant matches the organization profile and provide reasons:
            Grant: ${JSON.stringify(grant)}
            Profile: ${JSON.stringify(profile)}`
          }
        ]
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error('No response from OpenAI');
      }

      // Parse the result to extract score and reasons
      // This is a simplified example - you would need to implement proper parsing
      return {
        score: 0.8,
        reasons: ['Good match based on organization type', 'Funding amount aligns with needs']
      };
    } catch (error) {
      logger.error('Error scoring grant match:', error);
      throw error;
    }
  }
}

export const llmService = new LLMService();
