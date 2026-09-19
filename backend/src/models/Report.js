import mongoose from 'mongoose';
import { SOURCE_TYPE } from '../contracts/enums.js';
import { geoPointSchemaDef } from '../utils/geo.js';

const reportSchema = new mongoose.Schema({
  _id: { type: String },
  source_type: { type: String, enum: SOURCE_TYPE, required: true },
  source_label: { type: String, required: true },
  reporter_ref: { type: String, default: null }, // hashed, never raw phone (§13.3.1)
  text: { type: String, default: '' },
  language: { type: String, default: 'auto' },
  location: { type: geoPointSchemaDef, index: '2dsphere' },
  location_accuracy_m: { type: Number, default: null },
  occurred_at: { type: Date, required: true },
  received_at: { type: Date, default: Date.now },
  media: { type: [{ kind: String, url: String, caption: String }], default: [] },
  structured: { type: mongoose.Schema.Types.Mixed, default: null },
  is_simulated: { type: Boolean, default: false },
  sim_run_id: { type: String, default: null },

  processing_status: {
    type: String,
    enum: ['QUEUED', 'PROCESSING', 'PROCESSED', 'FAILED', 'NEEDS_LOCATION'],
    default: 'QUEUED',
  },
  incident_id: { type: String, default: null, index: true },
  extraction: { type: mongoose.Schema.Types.Mixed, default: null },
  embedding: { type: [Number], default: undefined },
  degraded_steps: { type: [String], default: [] },
}, { _id: false, versionKey: false });

reportSchema.index({ occurred_at: -1 });

export const Report = mongoose.model('Report', reportSchema);
