// Single source of truth for "can this signed-in user do X" on the frontend. The backend already
// enforces every one of these server-side (backend/src/platform/rbac.js) — this only decides what
// to show, never what to allow; the API call is the real gate.
export const PERMISSIONS = {
  VIEW_INCIDENTS: 'VIEW_INCIDENTS',
  EDIT_INCIDENT: 'EDIT_INCIDENT',
  APPROVE_DISPATCH: 'APPROVE_DISPATCH',
  APPROVE_PREEMPTION: 'APPROVE_PREEMPTION',
  OVERRIDE_SEVERITY: 'OVERRIDE_SEVERITY',
  MERGE_INCIDENT: 'MERGE_INCIDENT',
  SUPERSEDE_EVIDENCE: 'SUPERSEDE_EVIDENCE',
  CLOSE_INCIDENT: 'CLOSE_INCIDENT',
  UPDATE_OWN_UNIT: 'UPDATE_OWN_UNIT',
  ANALYTICS: 'ANALYTICS',
  RUN_SIMULATION: 'RUN_SIMULATION',
  SEE_REPORTER_CONTACT: 'SEE_REPORTER_CONTACT',
  MANAGE_RESOURCES: 'MANAGE_RESOURCES',
  ADMIN: 'ADMIN',
};

export function hasPermission(user, permission) {
  return Boolean(user?.permissions?.includes(permission));
}
