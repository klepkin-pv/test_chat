import mongoose from 'mongoose';
import { getDefaultMongoUri } from './app.js';
import { logger } from '../utils/logger.js';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || getDefaultMongoUri();
    await mongoose.connect(mongoURI);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error', error);
    throw error;
  }
};
