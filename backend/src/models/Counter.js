import mongoose from 'mongoose';

// generic atomic counter, used for per-room realtime `seq` (§13.5) and incident codes (INC-YYYY-NNNN)
const counterSchema = new mongoose.Schema({
  _id: { type: String }, // e.g. "seq:ops:global" or "incident_code:2026"
  value: { type: Number, default: 0 },
}, { _id: false, versionKey: false });

export const Counter = mongoose.model('Counter', counterSchema);

export async function nextCounter(key, incrementBy = 1) {
  const doc = await Counter.findByIdAndUpdate(
    key,
    { $inc: { value: incrementBy } },
    { upsert: true, new: true },
  );
  return doc.value;
}
