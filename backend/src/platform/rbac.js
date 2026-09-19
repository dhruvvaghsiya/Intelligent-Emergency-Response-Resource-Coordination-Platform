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
  ADMIN: 'ADMIN',
};

const P = PERMISSIONS;

// role -> Set(permission)
const MATRIX = {
  ADMIN: Object.values(P),
  COMMANDER: [
    P.VIEW_INCIDENTS, P.EDIT_INCIDENT, P.APPROVE_DISPATCH, P.APPROVE_PREEMPTION,
    P.OVERRIDE_SEVERITY, P.MERGE_INCIDENT, P.SUPERSEDE_EVIDENCE, P.CLOSE_INCIDENT,
    P.UPDATE_OWN_UNIT, P.ANALYTICS, P.SEE_REPORTER_CONTACT,
  ],
  DISPATCHER: [
    P.VIEW_INCIDENTS, P.EDIT_INCIDENT, P.APPROVE_DISPATCH, P.MERGE_INCIDENT,
    P.SUPERSEDE_EVIDENCE, P.UPDATE_OWN_UNIT, P.ANALYTICS, P.SEE_REPORTER_CONTACT,
  ],
  ANALYST: [P.VIEW_INCIDENTS, P.ANALYTICS],
  FIELD_UNIT: [P.VIEW_INCIDENTS, P.UPDATE_OWN_UNIT],
  VIEWER: [P.VIEW_INCIDENTS],
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

export function requireAnyRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('UNAUTHENTICATED'));
    if (!roles.includes(req.user.role)) {
      return next(new AppError('FORBIDDEN', 'Insufficient role for this action', { required_role: roles }));
    }
    next();
  };
}
