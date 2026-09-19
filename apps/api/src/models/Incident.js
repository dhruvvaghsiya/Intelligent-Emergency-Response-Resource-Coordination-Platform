import mongoose from 'mongoose';
import { INCIDENT_TYPE, INCIDENT_STATUS, SEVERITY, CAPABILITY } from '../contracts/enums.js';
import { geoPointSchemaDef } from '../utils/geo.js';

const incidentSchema = new mongoose.Schema({
  _id: { type: String },
  code: { type: String, required: true, unique: true }, // INC-2026-0147
  type: { type: String, enum: INCIDENT_TYPE, required: true },
  status: { type: String, enum: INCIDENT_STATUS, default: 'REPORTED' },
  severity: { type: String, enum: SEVERITY, default: 'INFO' },
  severity_score: { type: Number, default: 0 },

  title: { type: String, required: true },
  description: { type: String, default: '' },
  location: { type: geoPointSchemaDef, index: '2dsphere' },
  address: { type: String, default: null },
  ward: { type: String, default: null },

  required_capabilities: { type: [{ type: String, enum: CAPABILITY }], default: [] },
  units_required: { type: Number, default: 1 },
  people_count_estimate: { type: Number, default: null },

  occurred_at: { type: Date, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  closed_at: { type: Date, default: null },

  merged_into_id: { type: String, default: null },
  version: { type: Number, default: 1 },

  // denormalised caches, rebuildable from evidence/event_log at any time (§17)
  severity_assessment: { type: mongoose.Schema.Types.Mixed, default: null },
  beliefs: { type: mongoose.Schema.Types.Mixed, default: {} },

  report_count: { type: Number, default: 0 },
  is_simulated: { type: Boolean, default: false },
  sim_run_id: { type: String, default: null },
  degraded_steps: { type: [String], default: [] },

  ai: {
    classification_confidence: { type: Number, default: 0 },
    suggested_type: { type: String, enum: INCIDENT_TYPE, default: 'UNKNOWN' },
    briefing: { type: String, default: null },
    degraded: { type: Boolean, default: false },
  },

  timeline_seq: { type: Number, default: 0 },

  // denormalised snapshot of the most recently attached report's extraction, used by the
  // correlation scorer to compare a NEW report against this incident (§21.2) without re-reading
  // every evidence row.
  correlation_snapshot: { type: mongoose.Schema.Types.Mixed, default: null },
}, { _id: false, versionKey: false });

incidentSchema.index({ status: 1, severity_score: -1 });
incidentSchema.index({ updated_at: -1 });

export const Incident = mongoose.model('Incident', incidentSchema);
