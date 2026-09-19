import mongoose from 'mongoose';
import { supportsTransactions } from './db.js';
import { logger } from './logger.js';

/**
 * Runs `fn(session|null)` inside a Mongo multi-document transaction when the deployment is a
 * replica set (Atlas, or a locally configured one). A standalone mongod (the common hackathon
 * default) does not support transactions, so we fall back to `session = null` and the caller is
 * responsible for the compensating-rollback path (§15.2's "the database constraint is the real
 * guarantee" still holds via the partial unique index either way).
 */
export async function withOptionalTransaction(fn) {
  const canUseTransactions = await supportsTransactions();
  if (!canUseTransactions) {
    logger.debug('Transactions unsupported (standalone mongod) — using compensating-rollback path');
    return fn(null);
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
