import mongoose from 'mongoose';

const mergeJournalSchema = new mongoose.Schema({
  _id: { type: String },
  target_incident_id: { type: String, required: true, index: true },
  source_incident_id: { type: String, required: true, index: true },
  snapshot: { type: mongoose.Schema.Types.Mixed, required: true }, // pre-merge incident + evidence + reports
  reason: { type: String, default: '' },
  performed_by: { type: String, required: true },
  performed_at: { type: Date, default: Date.now },
  reverted_at: { type: Date, default: null },
}, { _id: false, versionKey: false });

export const MergeJournal = mongoose.model('MergeJournal', mergeJournalSchema);
