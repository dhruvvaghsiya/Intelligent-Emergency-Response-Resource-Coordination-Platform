import { Router } from 'express';
import { Incident } from '../../models/Incident.js';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.js';
import { requirePermission, PERMISSIONS } from '../../platform/rbac.js';
import { validateBody } from '../../middleware/validate.js';
import { SeverityOverrideSchema } from '../../contracts/schemas.js';
import { overrideSeverity } from './service.js';
import { AppError } from '../../platform/errors.js';
import { audit } from '../../platform/audit.js';

export const severityRouter = Router();

severityRouter.get('/incidents/:id/severity', optionalAuthenticate, async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) throw new AppError('NOT_FOUND', 'Incident not found');
    res.json({ data: incident.severity_assessment });
  } catch (err) { next(err); }
});

severityRouter.post('/incidents/:id/severity/override', authenticate, requirePermission(PERMISSIONS.OVERRIDE_SEVERITY), validateBody(SeverityOverrideSchema), async (req, res, next) => {
  try {
    const before = (await Incident.findById(req.params.id))?.severity_assessment;
    const assessment = await overrideSeverity(req.params.id, { severity: req.body.severity, reason: req.body.reason, userId: req.user.id, userName: req.user.name });
    await audit({ req, action: 'SEVERITY_OVERRIDE', entityKind: 'incident', entityId: req.params.id, before, after: assessment, reason: req.body.reason });
    res.json({ data: assessment });
  } catch (err) { next(err); }
});
