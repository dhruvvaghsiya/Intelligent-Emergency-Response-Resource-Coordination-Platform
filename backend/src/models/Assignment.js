import mongoose from 'mongoose';
import { ASSIGNMENT_STATUS } from '../contracts/enums.js';

const assignmentSchema = new mongoose.Schema({
  _id: { type: String },
  incident_id: { type: String, required: true, index: true },
  unit_id: { type: String, required: true, index: true },
  unit_call_sign: { type: String, required: true },
  status: { type: String, enum: ASSIGNMENT_STATUS, default: 'PROPOSED' },
  eta_seconds: { type: Number, default: null },
  eta_method: { type: String, enum: ['ROAD_GRAPH', 'HAVERSINE_FALLBACK'], default: null },
  distance_m: { type: Number, default: null },
  proposed_by: { type: String, enum: ['SYSTEM', 'OPERATOR'], default: 'SYSTEM' },
  approved_by_user_id: { type: String, default: null },
  preempted_from_incident_id: { type: String, default: null },
  rationale: { type: [String], default: [] },
  cost_breakdown: { type: mongoose.Schema.Types.Mixed, default: null },
  plan_id: { type: String, default: null },
  proposed_at: { type: Date, default: Date.now },
  approved_at: { type: Date, default: null },
  arrived_at: { type: Date, default: null },
  completed_at: { type: Date, default: null },
  version: { type: Number, default: 1 },

  // ⭐ THE concurrency guarantee (§15.2 / §13.7): set to true ONLY while status is
  // APPROVED/EN_ROUTE/ON_SCENE. A partial unique index on {unit_id} where this field
  // exists means a unit can hold at most one active assignment, enforced by MongoDB itself —
  // the API's version check is for a friendly error, this index is the actual guarantee.
  active_lock: { type: Boolean, default: undefined },
}, { _id: false, versionKey: false });

assignmentSchema.index(
  { unit_id: 1 },
  { unique: true, partialFilterExpression: { active_lock: { $exists: true } }, name: 'one_active_assignment_per_unit' },
);

export const Assignment = mongoose.model('Assignment', assignmentSchema);
