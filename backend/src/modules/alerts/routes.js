import { Router } from 'express';
import { Alert } from '../../models/Alert.js';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.js';
import { requirePermission, PERMISSIONS } from '../../platform/rbac.js';
import { ackAlert, toAlertWire } from './service.js';

import { manualAssign, toAssignmentWire } from '../dispatch/service.js';
import { AppError } from '../../platform/errors.js';

export const alertsRouter = Router();

alertsRouter.get('/alerts', optionalAuthenticate, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.unacked === 'true') filter.acked_at = null;
    const alerts = await Alert.find(filter).sort({ raised_at: -1 }).limit(200);
    res.json({ data: alerts.map(toAlertWire) });
  } catch (err) { next(err); }
});

alertsRouter.post('/alerts/:id/ack', authenticate, requirePermission(PERMISSIONS.EDIT_INCIDENT), async (req, res, next) => {
  try {
    const alert = await ackAlert(req.params.id, req.user.id);
    res.json({ data: alert ? toAlertWire(alert) : null });
  } catch (err) { next(err); }
});

alertsRouter.post('/alerts/:id/assign', authenticate, requirePermission(PERMISSIONS.ADMIN), async (req, res, next) => {
  try {
    const { unit_id, incident_id } = req.body;
    if (!unit_id) throw new AppError('BAD_REQUEST', 'unit_id is required');

    const alert = await Alert.findById(req.params.id);
    if (!alert) throw new AppError('NOT_FOUND', 'Alert not found');

    const targetIncidentId = incident_id || alert.incident_id || alert.payload?.incident_id;
    if (!targetIncidentId) throw new AppError('BAD_REQUEST', 'No incident associated with this alert');

    const assignment = await manualAssign(targetIncidentId, unit_id, { userId: req.user.id });
    const updatedAlert = await ackAlert(req.params.id, req.user.id);

    res.json({
      data: {
        alert: updatedAlert ? toAlertWire(updatedAlert) : null,
        assignment: assignment ? toAssignmentWire(assignment) : null,
      },
    });
  } catch (err) { next(err); }
});
