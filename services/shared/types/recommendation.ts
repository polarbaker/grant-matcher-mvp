export interface GrantRecommendationRequest {
  userId: string;
  preferences?: {
    grantTypes?: string[];
    fundingAmount?: {
      min: number;
      max: number;
    };
    categories?: string[];
    locations?: string[];
  };
  profile?: {
    organization?: {
      type: string;
      size: string;
    };
    expertise: string[];
    previousGrants?: {
      amount: number;
      year: number;
    }[];
  };
  page?: number;
  limit?: number;
}

export interface GrantRecommendation {
  grantId: string;
  title: string;
  description: string;
  amount: number;
  deadline: Date;
  matchScore: number;
  matchReasons: string[];
  source: string;
  url: string;
}

export interface RecommendationResponse {
  recommendations: GrantRecommendation[];
  total: number;
  page: number;
  hasMore: boolean;
}
