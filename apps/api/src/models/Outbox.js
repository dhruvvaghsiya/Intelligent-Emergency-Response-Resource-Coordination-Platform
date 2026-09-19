import mongoose from 'mongoose';

// at-least-once realtime delivery (§18.2): events are appended here in the same "transaction"
// as the domain write, then drained to Socket.IO after commit — never emitted inside the write.
const outboxSchema = new mongoose.Schema({
  _id: { type: String },
  event_id: { type: String, required: true },
  delivered: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
}, { _id: false, versionKey: false });

outboxSchema.index({ delivered: 1, created_at: 1 });

export const Outbox = mongoose.model('Outbox', outboxSchema);
