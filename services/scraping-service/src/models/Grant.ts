import mongoose, { Schema, Document } from 'mongoose';

export interface IGrant extends Document {
  title: string;
  description: string;
  amount: {
    min: number;
    max: number;
    currency: string;
  };
  deadline: Date;
  categories: string[];
  organization: string;
  applicationUrl: string;
  status: 'active' | 'inactive';
  eligibility: {
    regions: string[];
    organizationTypes: string[];
    requirements: string[];
  };
  lastScrapedFrom: string;
  lastScrapedAt: Date;
}

const GrantSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  amount: {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    currency: { type: String, required: true, default: 'USD' },
  },
  deadline: { type: Date, required: true },
  categories: [{ type: String }],
  organization: { type: String, required: true },
  applicationUrl: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['active', 'inactive'], 
    default: 'active',
    required: true 
  },
  eligibility: {
    regions: [{ type: String }],
    organizationTypes: [{ type: String }],
    requirements: [{ type: String }],
  },
  lastScrapedFrom: { type: String, required: true },
  lastScrapedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Create a compound index for checking duplicates
GrantSchema.index({ 
  title: 1, 
  organization: 1, 
  applicationUrl: 1 
}, { 
  unique: true 
});

export const Grant = mongoose.model<IGrant>('Grant', GrantSchema);
