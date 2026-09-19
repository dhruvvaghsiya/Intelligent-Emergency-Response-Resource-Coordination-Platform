import mongoose from 'mongoose';
import { JOB_STATUS, JOB_KIND } from '../contracts/enums.js';

// Postgres `FOR UPDATE SKIP LOCKED` equivalent for Mongo: findOneAndUpdate is atomic per-document,
// so "claim the oldest PENDING job" is a single atomic compare-and-set — no separate lock needed.
const jobSchema = new mongoose.Schema({
  _id: { type: String },
  kind: { type: String, enum: JOB_KIND, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  run_after: { type: Date, default: Date.now },
  attempts: { type: Number, default: 0 },
  locked_at: { type: Date, default: null },
  locked_by: { type: String, default: null },
  status: { type: String, enum: JOB_STATUS, default: 'PENDING' },
  last_error: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
}, { _id: false, versionKey: false });

jobSchema.index({ status: 1, run_after: 1, created_at: 1 });

export const Job = mongoose.model('Job', jobSchema);
