import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  emailVerified: boolean;
  preferences?: {
    grantTypes?: string[];
    fundingAmount?: {
      min: number;
      max: number;
    };
    categories?: string[];
    locations?: string[];
  };
  savedGrants?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema<IUser>({
  firstName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      message: (props: any) => `${props.value} is not a valid email address!`
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  preferences: {
    grantTypes: [String],
    fundingAmount: {
      min: Number,
      max: Number
    },
    categories: [String],
    locations: [String]
  },
  savedGrants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Grant'
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(Number(process.env.BCRYPT_SALT_ROUNDS) || 10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Error comparing passwords');
  }
};

export const User = mongoose.model<IUser>('User', userSchema);
