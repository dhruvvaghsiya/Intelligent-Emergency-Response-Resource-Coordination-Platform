import { Lock } from '../models/Lock.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * §15.2 — serialises simultaneous reports for the same event so they cannot create twin
 * incidents. block_key = type_family + geohash6 + time_bucket (computed by the caller).
 */
export async function withBlockLock(blockKey, fn, { retries = 20, retryDelayMs = 100 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await Lock.create({ _id: blockKey });
      try {
        return await fn();
      } finally {
        await Lock.deleteOne({ _id: blockKey }).catch(() => {});
      }
    } catch (err) {
      if (err?.code === 11000 && attempt < retries) {
        await sleep(retryDelayMs);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Could not acquire lock for ${blockKey}`);
}
