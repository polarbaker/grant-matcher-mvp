import axios, { AxiosError } from 'axios';
import { createLogger } from '../utils/logger';
import { User } from '../models/User';
import { Profile } from '../models/Profile';
import { GrantRecommendationRequest, RecommendationResponse } from '../../../shared/types/recommendation';
import { AppError } from '../middleware/errorHandler';

const logger = createLogger('recommendation-service');

export class RecommendationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:3001';
  }

  async getRecommendations(
    userId: string,
    page = 1,
    limit = 10,
    filters?: Record<string, any>
  ): Promise<{ items: any[]; total: number }> {
    try {
      // Get user and profile data
      const user = await User.findById(userId);
      const profile = await Profile.findOne({ user: userId });

      if (!user) {
        throw new AppError(404, 'User not found');
      }

      // Prepare recommendation request
      const request: GrantRecommendationRequest = {
        userId,
        preferences: user.preferences,
        profile: profile ? {
          organization: profile.organization,
          expertise: profile.expertise,
          previousGrants: profile.previousGrants?.map(grant => ({
            amount: grant.amount,
            year: grant.year
          }))
        } : undefined,
        page,
        limit
      };

      // Add filters if provided
      if (filters) {
        request.preferences = {
          ...request.preferences,
          ...filters
        };
      }

      // Get recommendations from service
      const response = await axios.post<RecommendationResponse>(
        `${this.baseUrl}/api/recommendations`,
        request
      );

      return {
        items: response.data.recommendations,
        total: response.data.total
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        logger.error('Recommendation service error:', {
          status: axiosError.response?.status,
          data: axiosError.response?.data
        });
        throw new AppError(
          axiosError.response?.status || 500,
          (axiosError.response?.data as any)?.message || 'Error fetching recommendations'
        );
      }
      throw error;
    }
  }

  async refreshRecommendations(userId: string): Promise<{ count: number }> {
    try {
      const response = await axios.post<{ count: number }>(
        `${this.baseUrl}/api/recommendations/refresh`,
        { userId }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        logger.error('Error refreshing recommendations:', {
          status: axiosError.response?.status,
          data: axiosError.response?.data
        });
        throw new AppError(
          axiosError.response?.status || 500,
          (axiosError.response?.data as any)?.message || 'Error refreshing recommendations'
        );
      }
      throw error;
    }
  }

  async getRecommendationById(userId: string, recommendationId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/recommendations/${recommendationId}`,
        { params: { userId } }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 404) {
          throw new AppError(404, 'Recommendation not found');
        }
        logger.error('Error fetching recommendation:', {
          status: axiosError.response?.status,
          data: axiosError.response?.data
        });
        throw new AppError(
          axiosError.response?.status || 500,
          (axiosError.response?.data as any)?.message || 'Error fetching recommendation'
        );
      }
      throw error;
    }
  }

  async updateRecommendationStatus(
    userId: string,
    recommendationId: string,
    status: string
  ): Promise<any> {
    try {
      const response = await axios.patch(
        `${this.baseUrl}/api/recommendations/${recommendationId}/status`,
        { userId, status }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 404) {
          throw new AppError(404, 'Recommendation not found');
        }
        logger.error('Error updating recommendation status:', {
          status: axiosError.response?.status,
          data: axiosError.response?.data
        });
        throw new AppError(
          axiosError.response?.status || 500,
          (axiosError.response?.data as any)?.message || 'Error updating recommendation status'
        );
      }
      throw error;
    }
  }
}
