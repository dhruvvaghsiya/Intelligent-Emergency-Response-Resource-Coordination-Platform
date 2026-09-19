// §19 INCIDENT LIFECYCLE 🔒 — legal transitions table, enforced here and only here.

export const TRANSITIONS = {
  REPORTED: ['TRIAGED', 'MERGED', 'FALSE_ALARM'],
  TRIAGED: ['DISPATCHED', 'MERGED', 'FALSE_ALARM', 'RESOLVED'],
  DISPATCHED: ['ON_SCENE', 'TRIAGED', 'MERGED'],
  ON_SCENE: ['CONTAINED', 'RESOLVED'],
  CONTAINED: ['RESOLVED', 'ON_SCENE'],
  RESOLVED: ['CLOSED', 'ON_SCENE'],
  CLOSED: [],
  MERGED: [],
  FALSE_ALARM: [],
};

export function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

export function assertTransition(from, to) {
  if (from === to) return; // idempotent no-op patches are allowed elsewhere
  if (!canTransition(from, to)) {
    const err = new Error(`Illegal transition ${from} -> ${to}`);
    err.code = 'ILLEGAL_TRANSITION';
    err.details = { from, to, allowed: TRANSITIONS[from] || [] };
    throw err;
  }
}
