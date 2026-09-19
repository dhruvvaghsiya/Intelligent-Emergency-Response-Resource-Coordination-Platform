import mongoose from 'mongoose';
import { DISPATCH_STRATEGY, CAPABILITY, ETA_METHOD } from '../contracts/enums.js';

const moveSchema = new mongoose.Schema({
  unit_id: String,
  unit_call_sign: String,
  from_incident_id: { type: String, default: null },
  from_incident_code: { type: String, default: null },
  eta_seconds: Number,
  eta_method: { type: String, enum: ETA_METHOD },
  capability_match: Number,
  preemption_regret: { type: Number, default: 0 },
  impact_note: String,
}, { _id: false });

const dispatchPlanSchema = new mongoose.Schema({
  _id: { type: String },
  incident_id: { type: String, required: true, index: true },
  strategy: { type: String, enum: DISPATCH_STRATEGY, required: true },
  total_cost: { type: Number, required: true },
  moves: { type: [moveSchema], default: [] },
  unmet_requirements: { type: [{ type: String, enum: CAPABILITY }], default: [] },
  feasible: { type: Boolean, default: true },
  requires_preemption: { type: Boolean, default: false },
  // snapshot of unit versions this plan assumed, revalidated at approval time (§15.2)
  assumed_versions: { type: mongoose.Schema.Types.Mixed, default: {} },
  generated_at: { type: Date, default: Date.now },
  expires_at: { type: Date, required: true },
  applied_at: { type: Date, default: null },
}, { _id: false, versionKey: false });

export const DispatchPlan = mongoose.model('DispatchPlan', dispatchPlanSchema);
