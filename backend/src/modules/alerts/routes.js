import { Router } from 'express';
import { Alert } from '../../models/Alert.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, PERMISSIONS } from '../../platform/rbac.js';
import { ackAlert, toAlertWire } from './service.js';

export const alertsRouter = Router();

alertsRouter.get('/alerts', authenticate, async (req, res, next) => {
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
