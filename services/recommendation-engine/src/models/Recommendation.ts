import mongoose from 'mongoose';

export interface IRecommendation {
  userId: string;
  grantId: string;
  title: string;
  description: string;
  amount: number;
  deadline: Date;
  matchScore: number;
  matchReasons: string[];
  source: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}

const recommendationSchema = new mongoose.Schema<IRecommendation>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  grantId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  amount: Number,
  deadline: Date,
  matchScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  matchReasons: [String],
  source: String,
  url: String
}, {
  timestamps: true
});

// Create compound index for efficient querying
recommendationSchema.index({ userId: 1, matchScore: -1 });

export const Recommendation = mongoose.model<IRecommendation>('Recommendation', recommendationSchema);
