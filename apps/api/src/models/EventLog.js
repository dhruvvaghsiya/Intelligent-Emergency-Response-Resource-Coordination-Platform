import mongoose from 'mongoose';

// §13.5 realtime envelope, persisted so /sync and /replay can serve it. `seq` is a monotonic
// per-room integer from platform/events.js's Counter-backed sequence (Postgres-sequence
// equivalent — survives restarts because it's in the DB, not in memory).
const eventLogSchema = new mongoose.Schema({
  _id: { type: String }, // event_id
  seq: { type: Number, required: true },
  room: { type: String, required: true, index: true },
  type: { type: String, required: true },
  v: { type: Number, default: 1 },
  ts: { type: Date, default: Date.now },
  entity: { kind: String, id: String },
  actor: { kind: String, id: String, name: String },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false, versionKey: false });

eventLogSchema.index({ room: 1, seq: 1 });
eventLogSchema.index({ 'entity.kind': 1, 'entity.id': 1, seq: 1 });
eventLogSchema.index({ ts: 1 });

export const EventLog = mongoose.model('EventLog', eventLogSchema);
