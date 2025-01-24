export interface GrantRecommendationRequest {
  userId: string;
  preferences?: {
    categories?: string[];
    fundingAmount?: {
      min?: number;
      max?: number;
    };
    location?: string[];
    keywords?: string[];
  };
  profile?: {
    organizationType?: string;
    industry?: string;
    experience?: string;
    teamSize?: number;
    previousGrants?: string[];
  };
  page?: number;
  limit?: number;
}

export interface GrantRecommendation {
  grantId: string;
  score: number;
  reasons: string[];
  matchingCriteria: {
    category?: boolean;
    amount?: boolean;
    location?: boolean;
    requirements?: boolean;
  };
}
