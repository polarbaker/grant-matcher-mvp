export enum GrantSector {
  TECHNOLOGY = 'technology',
  HEALTHCARE = 'healthcare',
  ENVIRONMENT = 'environment',
  EDUCATION = 'education',
  SOCIAL_IMPACT = 'social_impact',
  RESEARCH = 'research',
  ARTS = 'arts',
  STARTUPS = 'startups',
  SCIENCE = 'science',
  GENERAL = 'general',
  HEALTH = 'health',
  DEFENSE = 'defense',
  ENERGY = 'energy',
  SPACE = 'space',
  CLIMATE = 'climate',
  AI = 'ai',
  BIOTECH = 'biotech'
}

export interface GrantAmount {
  min?: number;
  max?: number;
  currency?: string;
}

export interface GrantFilters {
  sectors?: GrantSector[];
  amount?: GrantAmount;
  deadline?: {
    start?: Date;
    end?: Date;
  };
  keywords?: string[];
  sourceNames?: string[];
}

export interface Grant {
  id?: string;
  title: string;
  description: string;
  amount?: GrantAmount;
  deadline?: Date;
  applicationUrl: string;
  source: string;
  sectors: GrantSector[];
  lastScrapedAt?: Date;
  eligibility?: string;
  requirements?: string[];
  status?: 'open' | 'closed' | 'upcoming';
  contactInfo?: string;
}
