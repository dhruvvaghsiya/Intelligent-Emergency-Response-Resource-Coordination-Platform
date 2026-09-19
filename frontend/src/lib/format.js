/* =========================================================================
   FORMAT UTILITIES — §F4/F5: display formatting for the frontend
   FE owns nothing computational except formatting.
   ========================================================================= */

/**
 * Format seconds into human-readable duration: "4:32" or "12:05"
 */
export function formatDuration(seconds) {
  if (seconds == null) return '—';
  const mins = Math.floor(Math.abs(seconds) / 60);
  const secs = Math.abs(seconds) % 60;
  const sign = seconds < 0 ? '-' : '';
  return `${sign}${mins}:${String(Math.floor(secs)).padStart(2, '0')}`;
}

/**
 * Format metres into human-readable distance
 */
export function formatDistance(meters) {
  if (meters == null) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format ISO timestamp to IST display time (HH:MM:SS)
 */
export function formatTime(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Format ISO timestamp to IST display date+time
 */
export function formatDateTime(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Format relative time: "3 min ago", "12 s ago"
 */
export function formatRelativeTime(isoString) {
  if (!isoString) return '—';
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (diff < 5) return 'just now';
  if (diff < 60) return `${Math.floor(diff)} s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return `${Math.floor(diff / 86400)} d ago`;
}

/**
 * Format severity score with band label
 */
export function formatSeverityScore(score) {
  if (score == null) return '—';
  return String(score);
}

/**
 * Format a belief probability as percentage
 */
export function formatProbability(p) {
  if (p == null) return '—';
  return `${(p * 100).toFixed(0)}%`;
}

/**
 * Format a confidence value
 */
export function formatConfidence(c) {
  if (c == null) return '—';
  return `${(c * 100).toFixed(0)}%`;
}

/**
 * Format an evidence attribute key to human label
 */
export function formatAttribute(attr) {
  if (!attr) return '—';
  return attr
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Format incident code
 */
export function formatIncidentCode(code) {
  return code || '—';
}

/**
 * Format coordinates for display
 */
export function formatCoords(location) {
  if (!location) return '—';
  return `${location.lat.toFixed(4)}°N, ${location.lng.toFixed(4)}°E`;
}
