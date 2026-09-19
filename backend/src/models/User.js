import mongoose from 'mongoose';
import { ROLE } from '../contracts/enums.js';

const userSchema = new mongoose.Schema({
  _id: { type: String },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ROLE, required: true },
  station_id: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
}, { _id: false, versionKey: false });

export const User = mongoose.model('User', userSchema);
