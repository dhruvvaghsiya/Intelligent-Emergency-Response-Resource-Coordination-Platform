import { Router } from 'express';
import { Incident } from '../../models/Incident.js';
import { Hospital } from '../../models/Hospital.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, PERMISSIONS } from '../../platform/rbac.js';
import { validateBody } from '../../middleware/validate.js';
import { AssignmentCreateSchema, AssignmentCancelSchema } from '../../contracts/schemas.js';
import { generatePlans, approvePlan, manualAssign, cancelAssignment, updateAssignmentStatus, toPlanWire, toAssignmentWire, compareGreedyVsHungarian } from './service.js';
import { idempotent } from '../../platform/idempotency.js';
import { haversineDistanceMeters } from '../../core-logic/eta.js';
import { toWirePoint } from '../../utils/geo.js';
import { AppError } from '../../platform/errors.js';
import { z } from 'zod';

export const dispatchRouter = Router();

dispatchRouter.get('/incidents/:id/dispatch/plans', authenticate, requirePermission(PERMISSIONS.APPROVE_DISPATCH), async (req, res, next) => {
  try {
    const plans = await generatePlans(req.params.id);
    res.json({ data: plans.map(toPlanWire) });
  } catch (err) { next(err); }
});

dispatchRouter.get('/incidents/:id/dispatch/compare', authenticate, requirePermission(PERMISSIONS.APPROVE_DISPATCH), async (req, res, next) => {
  try {
    res.json({ data: await compareGreedyVsHungarian(req.params.id) });
  } catch (err) { next(err); }
});

dispatchRouter.post('/dispatch/plans/:planId/approve', authenticate, requirePermission(PERMISSIONS.APPROVE_DISPATCH), idempotent('dispatch_plan_approve'), async (req, res, next) => {
  try {
    const { plan, assignments } = await approvePlan(req.params.planId, { userId: req.user.id });
    res.json({ data: { plan: toPlanWire(plan), assignments: assignments.map(toAssignmentWire) } });
  } catch (err) { next(err); }
});

dispatchRouter.post('/assignments', authenticate, requirePermission(PERMISSIONS.APPROVE_DISPATCH), validateBody(AssignmentCreateSchema), async (req, res, next) => {
  try {
    const assignment = await manualAssign(req.body.incident_id, req.body.unit_id, { userId: req.user.id });
    res.status(201).json({ data: toAssignmentWire(assignment) });
  } catch (err) { next(err); }
});

const AssignmentPatchSchema = z.object({ status: z.string(), version: z.number().int().optional() });

dispatchRouter.patch('/assignments/:id', authenticate, requirePermission(PERMISSIONS.APPROVE_DISPATCH), validateBody(AssignmentPatchSchema), async (req, res, next) => {
  try {
    const assignment = await updateAssignmentStatus(req.params.id, req.body.status, { userId: req.user.id });
    res.json({ data: toAssignmentWire(assignment) });
  } catch (err) { next(err); }
});

dispatchRouter.post('/assignments/:id/cancel', authenticate, requirePermission(PERMISSIONS.APPROVE_DISPATCH), validateBody(AssignmentCancelSchema), async (req, res, next) => {
  try {
    const assignment = await cancelAssignment(req.params.id, { reason: req.body.reason, userId: req.user.id });
    res.json({ data: toAssignmentWire(assignment) });
  } catch (err) { next(err); }
});

/** §22.5 hospital selection — not in the frozen §13.3 table verbatim but explicitly specified
 * as P1 scope; exposed under the incident so the dispatcher can read it alongside a plan. */
dispatchRouter.get('/incidents/:id/hospitals/ranking', authenticate, requirePermission(PERMISSIONS.APPROVE_DISPATCH), async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) throw new AppError('NOT_FOUND', 'Incident not found');
    const hospitals = await Hospital.find();
    const incidentPoint = toWirePoint(incident.location);

    const ranked = hospitals.map((h) => {
      const distance_m = haversineDistanceMeters(incidentPoint, toWirePoint(h.location));
      const travel_time_s = Math.round(distance_m / 11);
      const bedsRatio = h.beds_total > 0 ? h.beds_available / h.beds_total : 0;
      const icuNeeded = incident.severity === 'CRITICAL';
      const icuHardFail = icuNeeded && h.icu_available === 0;
      const score = icuHardFail ? Infinity : travel_time_s + (1 - bedsRatio) * 300 + (icuNeeded && h.icu_available === 0 ? 600 : 0);
      return { hospital_id: h._id, name: h.name, distance_m: Math.round(distance_m), travel_time_s, beds_available: h.beds_available, icu_available: h.icu_available, score, reasons: [`${Math.round(travel_time_s / 60)} min away`, `${h.beds_available}/${h.beds_total} beds free`, `${h.icu_available} ICU free`] };
    }).filter((r) => Number.isFinite(r.score)).sort((a, b) => a.score - b.score).slice(0, 3);

    res.json({ data: ranked });
  } catch (err) { next(err); }
});
