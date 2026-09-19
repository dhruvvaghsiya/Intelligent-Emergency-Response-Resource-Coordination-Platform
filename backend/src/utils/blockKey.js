import { typeFamily } from '../contracts/tuning.js';

/** block_key = type_family + geohash6-ish + time_bucket (§15.2). A precise geohash isn't needed —
 * this only serialises concurrent writes for the *same* event, the real correlation match still
 * runs the full blocking+scoring pipeline. */
export function computeBlockKey(type, location, occurredAt, bucketMinutes = 5) {
  const latCell = Math.round(location.lat * 200); // ~0.005deg ≈ 550m grid
  const lngCell = Math.round(location.lng * 200);
  const bucket = Math.floor(new Date(occurredAt).getTime() / (bucketMinutes * 60 * 1000));
  return `${typeFamily(type)}:${latCell}:${lngCell}:${bucket}`;
}
