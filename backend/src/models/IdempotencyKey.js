import mongoose from 'mongoose';

const idempotencyKeySchema = new mongoose.Schema({
  _id: { type: String }, // the Idempotency-Key header value, scoped by route below
  route: { type: String, required: true },
  user_id: { type: String, default: null },
  request_hash: { type: String, required: true },
  response: { type: mongoose.Schema.Types.Mixed, required: true },
  status_code: { type: Number, required: true },
  created_at: { type: Date, default: Date.now, expires: 60 * 60 * 24 }, // TTL 24h (§F12)
}, { _id: false, versionKey: false });

export const IdempotencyKey = mongoose.model('IdempotencyKey', idempotencyKeySchema);
