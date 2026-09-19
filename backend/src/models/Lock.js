import mongoose from 'mongoose';

// pg_advisory_xact_lock(hashtext(block_key)) equivalent (§15.2): a short-lived unique document.
// Insert succeeds -> lock acquired; insert fails on duplicate key -> lock held by someone else.
// TTL index is a safety net if a holder crashes without releasing.
const lockSchema = new mongoose.Schema({
  _id: { type: String }, // the block_key
  acquired_at: { type: Date, default: Date.now, expires: 30 }, // 30s TTL safety net
}, { _id: false, versionKey: false });

export const Lock = mongoose.model('Lock', lockSchema);
