import mongoose from 'mongoose';
import { geoPointSchemaDef } from '../utils/geo.js';

const historySchema = new mongoose.Schema({
  _id: { type: String },
  unit_id: { type: String, required: true, index: true },
  location: { type: geoPointSchemaDef },
  recorded_at: { type: Date, required: true },
}, { _id: false, versionKey: false });

historySchema.index({ unit_id: 1, recorded_at: -1 });

export const UnitLocationHistory = mongoose.model('UnitLocationHistory', historySchema);
