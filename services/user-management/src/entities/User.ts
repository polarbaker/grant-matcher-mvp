import mongoose from 'mongoose';
import { IsEmail, MinLength } from 'class-validator';

export interface IUser {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  emailVerified: boolean;
  preferences?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>({
  firstName: {
    type: String,
    required: true,
    minlength: 2
  },
  lastName: {
    type: String,
    required: true,
    minlength: 2
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function(v: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: (props: any) => `${props.value} is not a valid email!`
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
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

export const User = mongoose.model<IUser>('User', userSchema);
