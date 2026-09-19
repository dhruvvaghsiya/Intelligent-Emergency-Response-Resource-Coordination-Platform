// §15.3 job worker — Postgres `SKIP LOCKED` equivalent using Mongo's atomic findOneAndUpdate.
// Concurrency 4, exponential backoff 2^attempts s, max 5 attempts -> DEAD + AI_DEGRADED-style alert.

import { Job } from '../models/Job.js';
import { newId } from '../utils/ids.js';
import { logger } from './logger.js';

const WORKER_ID = `worker-${process.pid}`;
const CONCURRENCY = 4;
const MAX_ATTEMPTS = 5;

const handlers = new Map();

export function registerJobHandler(kind, handler) {
  handlers.set(kind, handler);
}

export async function enqueueJob(kind, payload, { runAfter = new Date() } = {}) {
  const job = await Job.create({ _id: newId('job'), kind, payload, run_after: runAfter, status: 'PENDING' });
  return job;
}

async function claimOne() {
  return Job.findOneAndUpdate(
    { status: 'PENDING', run_after: { $lte: new Date() } },
    { $set: { status: 'RUNNING', locked_at: new Date(), locked_by: WORKER_ID }, $inc: { attempts: 1 } },
    { sort: { created_at: 1 }, new: true },
  );
}

async function runOne(job) {
  const handler = handlers.get(job.kind);
  if (!handler) {
    job.status = 'DEAD';
    job.last_error = `No handler registered for kind ${job.kind}`;
    await job.save();
    return;
  }
  try {
    await handler(job.payload, job);
    job.status = 'DONE';
    await job.save();
  } catch (err) {
    logger.error({ err, jobId: job._id, kind: job.kind, attempts: job.attempts }, 'job failed');
    if (job.attempts >= MAX_ATTEMPTS) {
      job.status = 'DEAD';
      job.last_error = String(err?.message || err);
      await job.save();
    } else {
      const backoffSeconds = 2 ** job.attempts;
      job.status = 'PENDING';
      job.run_after = new Date(Date.now() + backoffSeconds * 1000);
      job.last_error = String(err?.message || err);
      await job.save();
    }
  }
}

let running = false;

export function startJobWorker({ pollIntervalMs = 500 } = {}) {
  if (running) return;
  running = true;
  const tick = async () => {
    if (!running) return;
    try {
      const slots = Array.from({ length: CONCURRENCY });
      await Promise.all(slots.map(async () => {
        const job = await claimOne();
        if (job) await runOne(job);
      }));
    } catch (err) {
      logger.error({ err }, 'job worker tick failed');
    } finally {
      setTimeout(tick, pollIntervalMs);
    }
  };
  tick();
  logger.info('Job worker started (concurrency=%d)', CONCURRENCY);
}

export function stopJobWorker() {
  running = false;
}
