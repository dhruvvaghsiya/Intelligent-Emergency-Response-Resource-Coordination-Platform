import { Router } from 'express';
import { Incident } from '../../models/Incident.js';
import { EventLog } from '../../models/EventLog.js';
import { Assignment } from '../../models/Assignment.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../platform/rbac.js';
import { PERMISSIONS } from '../../platform/rbac.js';
import { validateBody } from '../../middleware/validate.js';
import { IncidentCreateSchema, IncidentPatchSchema } from '../../contracts/schemas.js';
import { bboxToGeoWithin, toGeoJson } from '../../utils/geo.js';
import { createIncident, toIncidentSummary, toIncidentDetail, patchIncidentStatus } from './service.js';
import { AppError } from '../../platform/errors.js';

export const incidentsRouter = Router();

incidentsRouter.get('/incidents', authenticate, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = { $in: String(req.query.status).split(',') };
    if (req.query.severity) filter.severity = { $in: String(req.query.severity).split(',') };
    if (req.query.type) filter.type = { $in: String(req.query.type).split(',') };
    if (req.query.has_conflict === 'true') filter['severity_assessment.is_contested'] = true;
    if (req.query.since) filter.updated_at = { $gte: new Date(req.query.since) };
    if (req.query.bbox) {
      const bbox = String(req.query.bbox).split(',').map(Number);
      filter.location = bboxToGeoWithin(bbox);
    }
    if (req.query.q) filter.$or = [{ title: new RegExp(escapeRegex(req.query.q), 'i') }, { code: new RegExp(escapeRegex(req.query.q), 'i') }];

    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const sort = req.query.sort === 'severity' ? { severity_score: -1 } : { updated_at: -1 };
    const docs = await Incident.find(filter).sort(sort).limit(limit);

    const counts = await Assignment.aggregate([
      { $match: { incident_id: { $in: docs.map((d) => d._id) }, status: { $in: ['APPROVED', 'EN_ROUTE', 'ON_SCENE'] } } },
      { $group: { _id: '$incident_id', count: { $sum: 1 } } },
    ]);
    const countByIncident = new Map(counts.map((c) => [c._id, c.count]));
    for (const d of docs) d._assigned_unit_count = countByIncident.get(d._id) || 0;

    res.json({ data: docs.map(toIncidentSummary), meta: { next_cursor: null, limit, total: docs.length } });
  } catch (err) { next(err); }
});

incidentsRouter.get('/incidents/geojson', authenticate, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = { $in: String(req.query.status).split(',') };
    const docs = await Incident.find(filter).limit(500);
    res.json({
      data: {
        type: 'FeatureCollection',
        features: docs.map((d) => ({
          type: 'Feature', geometry: d.location, properties: toIncidentSummary(d),
        })),
      },
    });
  } catch (err) { next(err); }
});

incidentsRouter.post('/incidents', authenticate, requirePermission(PERMISSIONS.EDIT_INCIDENT), validateBody(IncidentCreateSchema), async (req, res, next) => {
  try {
    const doc = await createIncident({ ...req.body, actor: { kind: 'USER', id: req.user.id, name: req.user.name } });
    res.status(201).json({ data: await toIncidentDetail(doc) });
  } catch (err) { next(err); }
});

incidentsRouter.get('/incidents/:id', authenticate, async (req, res, next) => {
  try {
    const doc = await Incident.findById(req.params.id);
    if (!doc) throw new AppError('NOT_FOUND', 'Incident not found');
    res.json({ data: await toIncidentDetail(doc) });
  } catch (err) { next(err); }
});

incidentsRouter.patch('/incidents/:id', authenticate, requirePermission(PERMISSIONS.EDIT_INCIDENT), validateBody(IncidentPatchSchema), async (req, res, next) => {
  try {
    const { status, type, title, version } = req.body;
    let doc;
    if (status) {
      const result = await patchIncidentStatus(req.params.id, { status, version, actor: { kind: 'USER', id: req.user.id, name: req.user.name } });
      doc = result.doc;
    } else {
      doc = await Incident.findById(req.params.id);
      if (!doc) throw new AppError('NOT_FOUND', 'Incident not found');
      if (doc.version !== version) throw new AppError('VERSION_CONFLICT', 'Incident has changed', { current: toIncidentSummary(doc) });
      if (type) doc.type = type;
      if (title) doc.title = title;
      doc.version += 1;
      doc.updated_at = new Date();
      await doc.save();
    }
    res.json({ data: await toIncidentDetail(doc) });
  } catch (err) { next(err); }
});

incidentsRouter.get('/incidents/:id/timeline', authenticate, async (req, res, next) => {
  try {
    const events = await EventLog.find({ 'entity.kind': 'incident', 'entity.id': req.params.id }).sort({ seq: 1 }).limit(1000);
    res.json({ data: events.map((e) => ({ event_id: e._id, seq: e.seq, type: e.type, ts: e.ts.toISOString(), actor: e.actor, payload: e.payload })) });
  } catch (err) { next(err); }
});

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export { toGeoJson };
