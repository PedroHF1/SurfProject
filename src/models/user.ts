import mongoose, { Model } from 'mongoose';
import AuthService from '@src/services/auth';
import logger from '@src/logger';

export interface User {
  _id?: string;
  name: string;
  email: string;
  password: string;
  address?: string;
  city?: string;
  state?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
}

export enum CUSTOM_VALIDATION {
  DUPLICATED = 'DUPLICATED',
}

const schema = new mongoose.Schema<User>(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: { type: String, required: true },
    address: { type: String, required: false },
    city: { type: String, required: false },
    state: { type: String, required: false },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret): void => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

schema.path('email').validate(async function (email: string) {
  const user = await mongoose.models.User.findOne({ email });
  if (user && !user._id.equals(this._id)) {
    return false;
  }
  return true;
}, 'is already registered.', CUSTOM_VALIDATION.DUPLICATED);

schema.pre('save', async function(): Promise<void> {
  if(!this.password || !this.isModified('password')) {
    return;
  }
  try {
    const hashedPassword = await AuthService.hashPassword(this.password);
    this.password = hashedPassword;
  } catch (error) {
    logger.error(`Error hashing the password for the user ${this.name}`, error);
  }
})

export const User: Model<User> = mongoose.model('User', schema);