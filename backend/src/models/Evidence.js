import mongoose from 'mongoose';
import { SOURCE_TYPE, EVIDENCE_ATTRIBUTE } from '../contracts/enums.js';

const evidenceSchema = new mongoose.Schema({
  _id: { type: String },
  incident_id: { type: String, required: true, index: true },
  report_id: { type: String, default: null },
  source_type: { type: String, enum: SOURCE_TYPE, required: true },
  source_label: { type: String, required: true },
  attribute: { type: String, enum: EVIDENCE_ATTRIBUTE, required: true },
  claimed_value: { type: mongoose.Schema.Types.Mixed, required: true },
  asserted_probability: { type: Number, required: true, min: 0, max: 1 },
  extraction_confidence: { type: Number, required: true, min: 0, max: 1 },
  source_reliability: { type: Number, required: true, min: 0, max: 1 },
  weight: { type: Number, required: true },
  observed_at: { type: Date, required: true },
  created_at: { type: Date, default: Date.now },
  is_simulated: { type: Boolean, default: false },
  superseded: { type: Boolean, default: false },
  superseded_reason: { type: String, default: null },
  superseded_by_user_id: { type: String, default: null },
}, { _id: false, versionKey: false });

evidenceSchema.index({ incident_id: 1, attribute: 1 });

export const Evidence = mongoose.model('Evidence', evidenceSchema);
