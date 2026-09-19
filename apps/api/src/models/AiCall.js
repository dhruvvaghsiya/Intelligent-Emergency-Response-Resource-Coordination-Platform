import mongoose from 'mongoose';

const aiCallSchema = new mongoose.Schema({
  _id: { type: String },
  endpoint: { type: String, required: true },
  latency_ms: { type: Number, required: true },
  ok: { type: Boolean, required: true },
  degraded: { type: Boolean, default: false },
  schema_failed: { type: Boolean, default: false },
  model: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
}, { _id: false, versionKey: false });

aiCallSchema.index({ created_at: -1 });

export const AiCall = mongoose.model('AiCall', aiCallSchema);
