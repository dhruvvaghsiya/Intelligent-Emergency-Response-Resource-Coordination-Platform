import mongoose from 'mongoose';

// Simplified road network (§17, §22.3): we do not ship a full routing graph in 48h — ETA uses the
// haversine fallback. This collection exists so cascade effects (§7 W5) have something real to
// mutate (`status`, `blocked_until`) and the honesty matrix stays accurate.
const roadSegmentSchema = new mongoose.Schema({
  _id: { type: String },
  name: { type: String, required: true },
  geometry: { type: mongoose.Schema.Types.Mixed, required: true }, // GeoJSON LineString
  base_speed_mps: { type: Number, default: 11 },
  status: { type: String, enum: ['OPEN', 'BLOCKED', 'DEGRADED'], default: 'OPEN' },
  blocked_until: { type: Date, default: null },
  blocked_by_incident_id: { type: String, default: null },
}, { _id: false, versionKey: false });

roadSegmentSchema.index({ geometry: '2dsphere' });

export const RoadSegment = mongoose.model('RoadSegment', roadSegmentSchema);
