import mongoose from 'mongoose';

const coverageCellSchema = new mongoose.Schema({
  _id: { type: String }, // cell_id, e.g. "23.020,72.580"
  centroid: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: [Number] },
  population_weight: { type: Number, default: 0 },
  t_reach_s: { type: Number, default: null },
  is_hole: { type: Boolean, default: false },
  computed_at: { type: Date, default: Date.now },
}, { _id: false, versionKey: false });

coverageCellSchema.index({ centroid: '2dsphere' });

export const CoverageCell = mongoose.model('CoverageCell', coverageCellSchema);
