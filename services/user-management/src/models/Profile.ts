import mongoose from 'mongoose';

export interface IProfile {
  user: mongoose.Types.ObjectId;
  organization?: {
    name: string;
    role: string;
    size: string;
    type: string;
  };
  bio?: string;
  interests: string[];
  expertise: string[];
  previousGrants?: {
    name: string;
    amount: number;
    year: number;
    description?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new mongoose.Schema<IProfile>({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  organization: {
    name: String,
    role: String,
    size: String,
    type: String
  },
  bio: String,
  interests: [String],
  expertise: [String],
  previousGrants: [{
    name: String,
    amount: Number,
    year: Number,
    description: String
  }]
}, {
  timestamps: true
});

export const Profile = mongoose.model<IProfile>('Profile', profileSchema);
