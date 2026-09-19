import { Router } from 'express';
import { Incident } from '../../models/Incident.js';
import { IncidentLink } from '../../models/IncidentLink.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, PERMISSIONS } from '../../platform/rbac.js';
import { validateBody } from '../../middleware/validate.js';
import { MergeSchema, UnmergeSchema, LinkSchema } from '../../contracts/schemas.js';
import { findBlockingCandidates, scoreCandidates, mergeIncidents, unmergeIncidents, createLink, toLinkWireLite } from './service.js';
import { toWirePoint } from '../../utils/geo.js';
import { AppError } from '../../platform/errors.js';
import { audit } from '../../platform/audit.js';

export const correlationRouter = Router();

correlationRouter.get('/incidents/:id/candidates', authenticate, requirePermission(PERMISSIONS.EDIT_INCIDENT), async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) throw new AppError('NOT_FOUND', 'Incident not found');
    const candidates = await findBlockingCandidates({
      type: incident.type, location: toWirePoint(incident.location), occurredAt: incident.occurred_at, locationAccuracyM: 0,
    });
    const others = candidates.filter((c) => c._id !== incident._id);
    const subject = { type: incident.type, entities: incident.correlation_snapshot?.entities, embedding: incident.correlation_snapshot?.embedding, source_type: incident.correlation_snapshot?.source_type, reporter_ref: incident.correlation_snapshot?.reporter_ref, occurred_at: incident.occurred_at, location: toWirePoint(incident.location) };
    const withSnap = others.map((c) => ({ ...c, entities: c.correlation_snapshot?.entities || [], embedding: c.correlation_snapshot?.embedding, _lastSourceType: c.correlation_snapshot?.source_type, _lastReporterRef: c.correlation_snapshot?.reporter_ref }));
    const scored = await scoreCandidates(subject, withSnap);
    res.json({ data: scored.map((s) => ({ incident_id: s.incident._id, incident_code: s.incident.code, score: s.score, band: s.band, features: s.features, contributions: s.contributions, explanation: s.explanation, degraded: s.degraded })) });
  } catch (err) { next(err); }
});

correlationRouter.post('/incidents/:id/merge', authenticate, requirePermission(PERMISSIONS.MERGE_INCIDENT), validateBody(MergeSchema), async (req, res, next) => {
  try {
    const detail = await mergeIncidents(req.params.id, req.body.source_incident_ids, { reason: req.body.reason, userId: req.user.id });
    await audit({ req, action: 'INCIDENT_MERGED', entityKind: 'incident', entityId: req.params.id, after: { source_incident_ids: req.body.source_incident_ids }, reason: req.body.reason });
    res.json({ data: detail });
  } catch (err) { next(err); }
});

correlationRouter.post('/incidents/:id/unmerge', authenticate, requirePermission(PERMISSIONS.MERGE_INCIDENT), validateBody(UnmergeSchema), async (req, res, next) => {
  try {
    const restored = await unmergeIncidents(req.params.id, req.body.child_incident_ids, { userId: req.user.id });
    await audit({ req, action: 'INCIDENT_UNMERGED', entityKind: 'incident', entityId: req.params.id, after: { restored } });
    res.json({ data: { restored_incident_ids: restored } });
  } catch (err) { next(err); }
});

correlationRouter.post('/incidents/:id/links', authenticate, requirePermission(PERMISSIONS.EDIT_INCIDENT), validateBody(LinkSchema), async (req, res, next) => {
  try {
    const link = await createLink({ from_incident_id: req.params.id, to_incident_id: req.body.to_incident_id, relation: req.body.relation, decided_by: 'OPERATOR', confirmed: true, explanation: req.body.note || '' });
    res.status(201).json({ data: toLinkWireLite(link) });
  } catch (err) { next(err); }
});

correlationRouter.delete('/incidents/:id/links/:linkId', authenticate, requirePermission(PERMISSIONS.EDIT_INCIDENT), async (req, res, next) => {
  try {
    await IncidentLink.deleteOne({ _id: req.params.linkId, from_incident_id: req.params.id });
    res.status(204).end();
  } catch (err) { next(err); }
});
