import mongoose from 'mongoose';
import { ALERT_TYPE, SEVERITY } from '../contracts/enums.js';

const alertSchema = new mongoose.Schema({
  _id: { type: String },
  type: { type: String, enum: ALERT_TYPE, required: true },
  severity: { type: String, enum: SEVERITY, default: 'INFO' },
  incident_id: { type: String, default: null, index: true },
  unit_id: { type: String, default: null },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  raised_at: { type: Date, default: Date.now },
  acked_by: { type: String, default: null },
  acked_at: { type: Date, default: null },
  dedupe_key: { type: String, default: null },
}, { _id: false, versionKey: false });

alertSchema.index({ raised_at: -1 });
alertSchema.index({ acked_at: 1 });

export const Alert = mongoose.model('Alert', alertSchema);
