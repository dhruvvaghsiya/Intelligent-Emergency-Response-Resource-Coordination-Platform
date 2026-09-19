import mongoose from 'mongoose';
import { geoPointSchemaDef } from '../utils/geo.js';

const hospitalSchema = new mongoose.Schema({
  _id: { type: String },
  name: { type: String, required: true },
  location: { type: geoPointSchemaDef, index: '2dsphere' },
  beds_total: { type: Number, default: 0 },
  beds_available: { type: Number, default: 0 },
  icu_available: { type: Number, default: 0 },
  specialities: { type: [String], default: [] },
  updated_at: { type: Date, default: Date.now },
  is_simulated: { type: Boolean, default: false },
}, { _id: false, versionKey: false });

export const Hospital = mongoose.model('Hospital', hospitalSchema);
