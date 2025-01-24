import mongoose, { Schema, Document } from 'mongoose';

// Enums and Types
export enum GrantStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  UPCOMING = 'upcoming',
  DRAFT = 'draft',
  ARCHIVED = 'archived'
}

export enum OrganizationType {
  NONPROFIT = 'nonprofit',
  FORPROFIT = 'forprofit',
  GOVERNMENT = 'government',
  EDUCATIONAL = 'educational',
  INDIVIDUAL = 'individual',
  RESEARCH = 'research',
  STARTUP = 'startup'
}

export enum GrantCategory {
  RESEARCH = 'research',
  EDUCATION = 'education',
  HEALTHCARE = 'healthcare',
  TECHNOLOGY = 'technology',
  ENVIRONMENT = 'environment',
  SOCIAL = 'social',
  ARTS = 'arts',
  SCIENCE = 'science',
  INNOVATION = 'innovation',
  COMMUNITY = 'community'
}

export enum ApplicationProcess {
  ONLINE = 'online',
  EMAIL = 'email',
  MAIL = 'mail',
  HYBRID = 'hybrid'
}

// Interfaces
export interface IGrantAmount {
  min: number;
  max: number;
  currency: string;
  isExact: boolean;
}

export interface IEligibility {
  organizationTypes: string[];
  locations?: string[];
  regions: string[];
  requirements: string[];
  restrictions: string[];
  minimumQualifications: string[];
}

export interface ITimeline {
  applicationStart: Date;
  applicationDeadline: Date;
  decisionDate?: Date;
  projectStart?: Date;
  projectEnd?: Date;
  reportingDeadlines?: Date[];
}

export interface IContact {
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  role?: string;
}

export interface IFunder {
  name: string;
  type: OrganizationType;
  description?: string;
  website?: string;
  contacts?: IContact[];
  previousGrants?: mongoose.Types.ObjectId[];
  totalFunding?: number;
  yearEstablished?: number;
  regions?: string[];
  preferredCategories?: GrantCategory[];
}

export interface IGrant extends Document {
  _id: string;
  title: string;
  description: string;
  summary: string;
  amount: IGrantAmount;
  timeline: ITimeline;
  status: GrantStatus;
  categories: GrantCategory[];
  eligibility: IEligibility;
  applicationProcess: ApplicationProcess;
  applicationUrl: string;
  funder: mongoose.Types.ObjectId;
  
  // Metadata
  source: string;
  sourceUrl: string;
  lastScrapedAt: Date;
  lastUpdatedAt: Date;
  createdAt: Date;
  
  // Additional Details
  objectives: string[];
  fundingAreas: string[];
  keywords: string[];
  requirements: string[];
  supportingDocuments: string[];
  faqs: { question: string; answer: string }[];
  
  // Success Metrics
  successRate?: number;
  averageAwardAmount?: number;
  totalAwards?: number;
  previousWinners?: string[];
  
  // Matching Data
  matchingScore?: number;
  matchingFactors?: {
    categoryMatch: number;
    amountMatch: number;
    locationMatch: number;
    requirementsMatch: number;
    organizationTypeMatch: number;
  };
  
  // Vector Embeddings for Semantic Search
  titleEmbedding?: number[];
  descriptionEmbedding?: number[];
  
  deadline?: Date;
  
  // Methods
  calculateMatchScore(organization: IOrganization): Promise<number>;
  isEligible(organization: IOrganization): Promise<boolean>;
  generateEmbeddings(): Promise<void>;
}

export interface IOrganization extends Document {
  name: string;
  type: OrganizationType;
  description: string;
  mission: string;
  vision?: string;
  
  // Contact & Location
  primaryContact: IContact;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  
  // Registration & Legal
  registrationNumber?: string;
  taxId?: string;
  foundingYear: number;
  
  // Financial Information
  annualBudget?: number;
  fundingHistory?: {
    year: number;
    amount: number;
    sources: string[];
  }[];
  
  // Capabilities
  expertise: string[];
  focusAreas: GrantCategory[];
  previousProjects?: {
    name: string;
    description: string;
    outcome: string;
    budget: number;
    year: number;
  }[];
  
  // Grant Preferences
  preferredGrantSize?: {
    min: number;
    max: number;
  };
  preferredCategories: GrantCategory[];
  preferredRegions: string[];
  
  // Vector Embeddings
  missionEmbedding?: number[];
  expertiseEmbedding?: number[];
}

export interface IMatchingProfile extends Document {
  organization: mongoose.Types.ObjectId;
  preferences: {
    categories: GrantCategory[];
    grantSize: {
      min: number;
      max: number;
    };
    regions: string[];
    timeline: {
      preferredDuration: number;
      earliestStartDate: Date;
      latestEndDate: Date;
    };
    keywords: string[];
    excludedFunders?: mongoose.Types.ObjectId[];
  };
  
  weights: {
    categoryMatch: number;
    amountMatch: number;
    locationMatch: number;
    timelineMatch: number;
    requirementsMatch: number;
  };
  
  filters: {
    minimumAmount?: number;
    maximumAmount?: number;
    deadlineThreshold?: number;
    requiredCategories?: GrantCategory[];
    excludedCategories?: GrantCategory[];
  };
  
  customScoring: {
    rules: [{
      condition: string,
      score: number,
      weight: number
    }]
  };
}

// Schemas
const GrantAmountSchema = new Schema<IGrantAmount>({
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  currency: { type: String, required: true, default: 'USD' },
  isExact: { type: Boolean, default: false }
});

const EligibilitySchema = new Schema<IEligibility>({
  organizationTypes: [String],
  locations: [String],
  regions: [String],
  requirements: [String],
  restrictions: [String],
  minimumQualifications: [String]
});

const TimelineSchema = new Schema<ITimeline>({
  applicationStart: { type: Date, required: true },
  applicationDeadline: { type: Date, required: true },
  decisionDate: Date,
  projectStart: Date,
  projectEnd: Date,
  reportingDeadlines: [Date]
});

const ContactSchema = new Schema<IContact>({
  name: String,
  email: String,
  phone: String,
  department: String,
  role: String
});

const FunderSchema = new Schema<IFunder>({
  name: { type: String, required: true },
  type: { type: String, enum: Object.values(OrganizationType), required: true },
  description: String,
  website: String,
  contacts: [ContactSchema],
  previousGrants: [{ type: Schema.Types.ObjectId, ref: 'Grant' }],
  totalFunding: Number,
  yearEstablished: Number,
  regions: [String],
  preferredCategories: [{ type: String, enum: Object.values(GrantCategory) }]
});

const GrantSchema = new Schema<IGrant>({
  _id: { type: String, required: true },
  title: { type: String, required: true, index: true },
  description: { type: String, required: true },
  summary: { type: String, required: true },
  amount: { type: GrantAmountSchema, required: true },
  timeline: { type: TimelineSchema, required: true },
  status: { 
    type: String, 
    enum: Object.values(GrantStatus), 
    required: true,
    index: true 
  },
  categories: [{ 
    type: String, 
    enum: Object.values(GrantCategory),
    index: true 
  }],
  eligibility: { type: EligibilitySchema, required: true },
  applicationProcess: { 
    type: String, 
    enum: Object.values(ApplicationProcess),
    required: true 
  },
  applicationUrl: { type: String, required: true },
  funder: { type: Schema.Types.ObjectId, ref: 'Funder', required: true },
  
  source: { type: String, required: true },
  sourceUrl: { type: String, required: true },
  lastScrapedAt: { type: Date, required: true },
  lastUpdatedAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  
  objectives: [String],
  fundingAreas: [String],
  keywords: [{ type: String, index: true }],
  requirements: [String],
  supportingDocuments: [String],
  faqs: [{
    question: String,
    answer: String
  }],
  
  successRate: Number,
  averageAwardAmount: Number,
  totalAwards: Number,
  previousWinners: [String],
  
  matchingScore: Number,
  matchingFactors: {
    categoryMatch: Number,
    amountMatch: Number,
    locationMatch: Number,
    requirementsMatch: Number,
    organizationTypeMatch: Number
  },
  
  titleEmbedding: [Number],
  descriptionEmbedding: [Number],
  deadline: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const OrganizationSchema = new Schema<IOrganization>({
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: Object.values(OrganizationType), 
    required: true 
  },
  description: { type: String, required: true },
  mission: { type: String, required: true },
  vision: String,
  
  primaryContact: { type: ContactSchema, required: true },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  
  registrationNumber: String,
  taxId: String,
  foundingYear: { type: Number, required: true },
  
  annualBudget: Number,
  fundingHistory: [{
    year: Number,
    amount: Number,
    sources: [String]
  }],
  
  expertise: [String],
  focusAreas: [{ 
    type: String, 
    enum: Object.values(GrantCategory),
    required: true 
  }],
  previousProjects: [{
    name: String,
    description: String,
    outcome: String,
    budget: Number,
    year: Number
  }],
  
  preferredGrantSize: {
    min: Number,
    max: Number
  },
  preferredCategories: [{ 
    type: String, 
    enum: Object.values(GrantCategory) 
  }],
  preferredRegions: [String],
  
  missionEmbedding: [Number],
  expertiseEmbedding: [Number]
});

const MatchingProfileSchema = new Schema<IMatchingProfile>({
  organization: { 
    type: Schema.Types.ObjectId, 
    ref: 'Organization',
    required: true 
  },
  preferences: {
    categories: [{ 
      type: String, 
      enum: Object.values(GrantCategory) 
    }],
    grantSize: {
      min: Number,
      max: Number
    },
    regions: [String],
    timeline: {
      preferredDuration: Number,
      earliestStartDate: Date,
      latestEndDate: Date
    },
    keywords: [String],
    excludedFunders: [{ type: Schema.Types.ObjectId, ref: 'Funder' }]
  },
  
  weights: {
    categoryMatch: { type: Number, default: 1.0 },
    amountMatch: { type: Number, default: 1.0 },
    locationMatch: { type: Number, default: 1.0 },
    timelineMatch: { type: Number, default: 1.0 },
    requirementsMatch: { type: Number, default: 1.0 }
  },
  
  filters: {
    minimumAmount: Number,
    maximumAmount: Number,
    deadlineThreshold: Number,
    requiredCategories: [{ type: String, enum: Object.values(GrantCategory) }],
    excludedCategories: [{ type: String, enum: Object.values(GrantCategory) }]
  },
  
  customScoring: {
    rules: [{
      condition: { type: String },
      score: { type: Number },
      weight: { type: Number }
    }]
  }
});

// Indexes
GrantSchema.index({ 
  title: 'text', 
  description: 'text', 
  keywords: 'text' 
});

GrantSchema.index({ 
  'amount.min': 1, 
  'amount.max': 1 
});

GrantSchema.index({ 
  'timeline.applicationDeadline': 1 
});

OrganizationSchema.index({ 
  name: 'text', 
  description: 'text', 
  mission: 'text' 
});

// Export models
export const Grant = mongoose.model<IGrant>('Grant', GrantSchema);
export const Organization = mongoose.model<IOrganization>('Organization', OrganizationSchema);
export const MatchingProfile = mongoose.model<IMatchingProfile>('MatchingProfile', MatchingProfileSchema);
export const Funder = mongoose.model<IFunder>('Funder', FunderSchema);
