// §F3 — GeoJSON order everywhere: [longitude, latitude], WGS84/4326. Wire type is {lng,lat}.

import mongoose from 'mongoose';

// A real Schema instance (not a plain object) — required so `{ type: geoPointSchemaDef, index:
// '2dsphere' }` field definitions are unambiguous to Mongoose (a plain object here collides with
// Mongoose's own `{ type: ... }` shorthand detection).
export const geoPointSchemaDef = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], required: true }, // [lng, lat]
}, { _id: false });

export function toGeoJson({ lng, lat }) {
  return { type: 'Point', coordinates: [lng, lat] };
}

export function toWirePoint(geoJsonPoint) {
  if (!geoJsonPoint?.coordinates) return null;
  const [lng, lat] = geoJsonPoint.coordinates;
  return { lng, lat };
}

export function bboxToGeoWithin([minLng, minLat, maxLng, maxLat]) {
  return {
    $geoWithin: {
      $box: [[minLng, minLat], [maxLng, maxLat]],
    },
  };
}
