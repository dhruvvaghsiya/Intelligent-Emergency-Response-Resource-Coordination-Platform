import mongoose from 'mongoose';
import { UNIT_TYPE, CAPABILITY, UNIT_STATUS } from '../contracts/enums.js';
import { geoPointSchemaDef } from '../utils/geo.js';

const unitSchema = new mongoose.Schema({
  _id: { type: String },
  call_sign: { type: String, required: true, unique: true },
  type: { type: String, enum: UNIT_TYPE, required: true },
  capabilities: { type: [{ type: String, enum: CAPABILITY }], default: [] },
  status: { type: String, enum: UNIT_STATUS, default: 'AVAILABLE' },
  station_id: { type: String, required: true },
  location: { type: geoPointSchemaDef, index: '2dsphere' },
  heading: { type: Number, default: null },
  speed_mps: { type: Number, default: 0 },
  last_location_at: { type: Date, default: Date.now },
  crew_size: { type: Number, default: 2 },
  current_assignment_id: { type: String, default: null },
  version: { type: Number, default: 1 },
  is_simulated: { type: Boolean, default: false },
}, { _id: false, versionKey: false });

unitSchema.index({ status: 1 });

export const Unit = mongoose.model('Unit', unitSchema);
