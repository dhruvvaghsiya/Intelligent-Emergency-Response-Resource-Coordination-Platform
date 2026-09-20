// Named AOI anchor points reused from seed/seed.js station locations plus a few extra wards, so
// generated reports land on real, nameable places instead of random noise inside the bbox.

export const CITY_CENTER = { lng: 72.5797, lat: 23.0225 };

export const ANCHORS = [
  { name: 'Sabarmati Riverfront', ward: 'Riverfront Zone', location: { lng: 72.5797, lat: 23.0225 } },
  { name: 'Maninagar', ward: 'East Zone', location: { lng: 72.6100, lat: 22.9950 } },
  { name: 'Vatva GIDC', ward: 'South-East Industrial Zone', location: { lng: 72.6281, lat: 22.9872 } },
  { name: 'Navrangpura', ward: 'Central Zone', location: { lng: 72.5600, lat: 23.0350 } },
  { name: 'Bopal', ward: 'West Zone', location: { lng: 72.4700, lat: 23.0350 } },
  { name: 'Chandkheda', ward: 'North Zone', location: { lng: 72.5900, lat: 23.1000 } },
  { name: 'Ellis Bridge', ward: 'Central Zone', location: { lng: 72.5697, lat: 23.0180 } },
  { name: 'SG Highway', ward: 'West Zone', location: { lng: 72.5100, lat: 23.0400 } },
  { name: 'Naroda', ward: 'North-East Zone', location: { lng: 72.6650, lat: 23.0700 } },
  { name: 'Paldi', ward: 'Central Zone', location: { lng: 72.5650, lat: 23.0080 } },
];

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomAnchor() {
  return pick(ANCHORS);
}

/** Jitter a point by up to `maxMeters` in a random direction — keeps clustered reports near, but
 * not exactly on top of, the anchor (mirrors real GPS noise). */
export function jitterLocation(loc, maxMeters = 300) {
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((loc.lat * Math.PI) / 180);
  const dLat = (Math.random() - 0.5) * 2 * (maxMeters / metersPerDegLat);
  const dLng = (Math.random() - 0.5) * 2 * (maxMeters / metersPerDegLng);
  return { lng: loc.lng + dLng, lat: loc.lat + dLat };
}
