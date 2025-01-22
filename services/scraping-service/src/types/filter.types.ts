import { GrantSector } from './grant.types';

export enum SortField {
  AMOUNT = 'amount',
  DEADLINE = 'deadline',
  RELEVANCE = 'relevance'
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface SortOptions {
  field: SortField;
  order: SortOrder;
}

export interface FilterPreset {
  name: string;
  description: string;
  filters: {
    sectors?: GrantSector[];
    amount?: {
      min?: number;
      max?: number;
    };
    deadline?: {
      start?: Date;
      end?: Date;
    };
    keywords?: string[];
  };
}

export const FILTER_PRESETS: FilterPreset[] = [
  {
    name: 'tech-startups',
    description: 'Technology startup grants and accelerators',
    filters: {
      sectors: [GrantSector.TECHNOLOGY, GrantSector.STARTUPS],
      amount: {
        min: 25000
      }
    }
  },
  {
    name: 'research-grants',
    description: 'Academic and scientific research funding',
    filters: {
      sectors: [GrantSector.RESEARCH, GrantSector.SCIENCE],
      amount: {
        min: 100000
      }
    }
  },
  {
    name: 'environmental',
    description: 'Climate and environmental initiatives',
    filters: {
      sectors: [GrantSector.ENVIRONMENT],
      keywords: ['climate', 'sustainability', 'renewable']
    }
  },
  {
    name: 'social-impact',
    description: 'Social innovation and impact projects',
    filters: {
      sectors: [GrantSector.SOCIAL_IMPACT],
      keywords: ['community', 'social', 'impact']
    }
  },
  {
    name: 'urgent-deadline',
    description: 'Grants closing within 30 days',
    filters: {
      deadline: {
        end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    }
  }
];
