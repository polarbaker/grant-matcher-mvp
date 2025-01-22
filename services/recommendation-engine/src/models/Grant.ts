import mongoose, { Document, Schema } from 'mongoose';

interface FeedbackItem {
  userId: string;
  rating: number;
  comment?: string;
  status: 'interested' | 'not_interested' | 'applied';
  timestamp: Date;
}

export interface IGrant extends Document {
  title: string;
  description: string;
  organization: string;
  amount: {
    min: number;
    max: number;
    currency: string;
  };
  deadline: Date;
  categories: string[];
  status: string;
  applicationUrl: string;
  eligibility: {
    regions: string[];
    organizationTypes: string[];
    requirements: string[];
  };
  feedback: FeedbackItem[];
  applicationCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const grantSchema = new Schema<IGrant>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    organization: { type: String, required: true },
    amount: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
      currency: { type: String, required: true },
    },
    deadline: { type: Date, required: true },
    categories: { type: [String], required: true },
    status: {
      type: String,
      required: true,
      enum: ['active', 'closed', 'draft'],
      default: 'active',
    },
    applicationUrl: { type: String, required: true },
    eligibility: {
      regions: { type: [String], required: true },
      organizationTypes: { type: [String], required: true },
      requirements: { type: [String], required: true },
    },
    feedback: [{
      userId: { type: String, required: true },
      rating: { type: Number, required: true, min: 1, max: 5 },
      comment: { type: String },
      status: {
        type: String,
        required: true,
        enum: ['interested', 'not_interested', 'applied'],
      },
      timestamp: { type: Date, default: Date.now },
    }],
    applicationCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Add text indexes for search
grantSchema.index(
  {
    title: 'text',
    description: 'text',
    categories: 'text',
    'eligibility.requirements': 'text',
  },
  {
    weights: {
      title: 10,
      description: 5,
      categories: 3,
      'eligibility.requirements': 2,
    },
  }
);

export const Grant = mongoose.model<IGrant>('Grant', grantSchema);
