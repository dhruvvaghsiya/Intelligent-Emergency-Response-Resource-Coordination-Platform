// §25.2 RBAC matrix 🔒 — one requirePermission() preHandler equivalent + shared can() helper.

import { AppError } from './errors.js';

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

const P = PERMISSIONS;

// role -> Set(permission) — a single role (ADMIN, see contracts/enums.js ROLE) holds every
// permission there is. Anonymous/public visitors hold none (req.user is null — see
// optionalAuthenticate in middleware/auth.js) rather than being modeled as a "VIEWER" role.
const MATRIX = {
  ADMIN: Object.values(P),
};

export function can(role, permission) {
  return (MATRIX[role] || []).includes(permission);
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('UNAUTHENTICATED'));
    if (!can(req.user.role, permission)) {
      return next(new AppError('FORBIDDEN', 'Insufficient role for this action', { required_role: permission }));
    }
    next();
  };
}
