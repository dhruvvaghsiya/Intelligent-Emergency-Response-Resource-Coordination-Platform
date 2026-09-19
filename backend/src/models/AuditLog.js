import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  _id: { type: String },
  user_id: { type: String, default: null },
  action: { type: String, required: true },
  entity_kind: { type: String, required: true },
  entity_id: { type: String, required: true },
  before: { type: mongoose.Schema.Types.Mixed, default: null },
  after: { type: mongoose.Schema.Types.Mixed, default: null },
  reason: { type: String, default: null },
  ip: { type: String, default: null },
  request_id: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
}, { _id: false, versionKey: false });

auditLogSchema.index({ entity_kind: 1, entity_id: 1, created_at: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
