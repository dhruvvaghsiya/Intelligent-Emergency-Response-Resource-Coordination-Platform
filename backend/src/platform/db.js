import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let connected = false;

export async function connectDb() {
  if (connected) return mongoose.connection;
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI);
  connected = true;
  logger.info({ uri: env.MONGODB_URI }, 'MongoDB connected');

  // Multi-document transactions require a replica set. Local single-node mongod does not
  // provide one by default, so the dispatch-approval transaction (platform/transactions.js)
  // detects this at call time and falls back to an atomic compare-and-swap sequence instead —
  // the partial unique index remains the real guarantee either way (see §15.2 in README).
  mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB connection error'));
  return mongoose.connection;
}

export function isDbHealthy() {
  return mongoose.connection.readyState === 1;
}

export async function supportsTransactions() {
  try {
    const admin = mongoose.connection.db.admin();
    const info = await admin.command({ hello: 1 });
    return Boolean(info.setName);
  } catch {
    return false;
  }
}
