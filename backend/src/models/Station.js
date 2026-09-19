import mongoose from 'mongoose';
import { geoPointSchemaDef } from '../utils/geo.js';

const stationSchema = new mongoose.Schema({
  _id: { type: String },
  name: { type: String, required: true },
  location: { type: geoPointSchemaDef, index: '2dsphere' },
}, { _id: false, versionKey: false });

export const Station = mongoose.model('Station', stationSchema);
