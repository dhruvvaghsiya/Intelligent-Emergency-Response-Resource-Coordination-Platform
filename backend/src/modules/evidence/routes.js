import { Router } from 'express';
import { Evidence } from '../../models/Evidence.js';
import { Incident } from '../../models/Incident.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, PERMISSIONS } from '../../platform/rbac.js';
import { validateBody } from '../../middleware/validate.js';
import { EvidenceSupersedeSchema } from '../../contracts/schemas.js';
import { supersedeEvidence } from './service.js';
import { toEvidenceWire } from '../incidents/service.js';
import { AppError } from '../../platform/errors.js';

export const evidenceRouter = Router();

evidenceRouter.get('/incidents/:id/evidence', authenticate, async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) throw new AppError('NOT_FOUND', 'Incident not found');
    const evidence = await Evidence.find({ incident_id: req.params.id }).sort({ created_at: 1 });
    res.json({ data: { evidence: evidence.map(toEvidenceWire), beliefs: Object.values(incident.beliefs || {}) } });
  } catch (err) { next(err); }
});

evidenceRouter.post('/incidents/:id/evidence/:evidenceId/supersede', authenticate, requirePermission(PERMISSIONS.SUPERSEDE_EVIDENCE), validateBody(EvidenceSupersedeSchema), async (req, res, next) => {
  try {
    const { evidence, beliefs } = await supersedeEvidence(req.params.id, req.params.evidenceId, { reason: req.body.reason, userId: req.user.id });
    res.json({ data: { evidence: toEvidenceWire(evidence), beliefs: Object.values(beliefs) } });
  } catch (err) { next(err); }
});
