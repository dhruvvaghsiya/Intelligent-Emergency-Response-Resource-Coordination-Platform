import mongoose from 'mongoose';
import { RELATION_TYPE } from '../contracts/enums.js';

const linkSchema = new mongoose.Schema({
  _id: { type: String },
  from_incident_id: { type: String, required: true, index: true },
  to_incident_id: { type: String, required: true, index: true },
  relation: { type: String, enum: RELATION_TYPE, required: true },
  score: { type: Number, default: null },
  features: { type: mongoose.Schema.Types.Mixed, default: {} },
  contributions: { type: mongoose.Schema.Types.Mixed, default: {} },
  explanation: { type: String, default: '' },
  decided_by: { type: String, enum: ['SYSTEM', 'OPERATOR'], default: 'SYSTEM' },
  confirmed: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
}, { _id: false, versionKey: false });

linkSchema.index({ from_incident_id: 1, to_incident_id: 1, relation: 1 }, { unique: true });

export const IncidentLink = mongoose.model('IncidentLink', linkSchema);
