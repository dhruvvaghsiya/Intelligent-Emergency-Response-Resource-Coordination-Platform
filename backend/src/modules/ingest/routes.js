// §13.3.1 POST /reports — the single ingest door. Always fast (<80ms): validate, persist, enqueue.

import { Router } from 'express';
import { Report } from '../../models/Report.js';
import { newId } from '../../utils/ids.js';
import { toGeoJson } from '../../utils/geo.js';
import { validateBody } from '../../middleware/validate.js';
import { ReportBodySchema } from '../../contracts/schemas.js';
import { reportsIpLimiter } from '../../platform/rateLimit.js';
import { enqueueJob } from '../../platform/jobs.js';
import { optionalAuthenticate } from '../../middleware/auth.js';
import { raiseAlert } from '../alerts/service.js';

export const ingestRouter = Router();

const AOI_BBOX = [72.45, 22.95, 72.72, 23.13]; // Ahmedabad AOI (§13.8)

function withinAoi({ lng, lat }) {
  return lng >= AOI_BBOX[0] && lng <= AOI_BBOX[2] && lat >= AOI_BBOX[1] && lat <= AOI_BBOX[3];
}

ingestRouter.post('/reports', reportsIpLimiter, optionalAuthenticate, validateBody(ReportBodySchema), async (req, res, next) => {
  try {
    const body = req.body;
    const reportId = newId('report');
    const occurredAt = body.occurred_at ? new Date(body.occurred_at) : new Date();
    
    // Ensure coordinates gracefully fit the operational response area
    let cleanLoc = { lng: Number(body.location.lng), lat: Number(body.location.lat) };
    if (!withinAoi(cleanLoc)) {
      cleanLoc = {
        lng: Math.max(AOI_BBOX[0] + 0.02, Math.min(AOI_BBOX[2] - 0.02, cleanLoc.lng || 72.5714)),
        lat: Math.max(AOI_BBOX[1] + 0.02, Math.min(AOI_BBOX[3] - 0.02, cleanLoc.lat || 23.0258)),
      };
    }

    const report = await Report.create({
      _id: reportId,
      source_type: body.source_type,
      source_label: body.source_label,
      reporter_ref: body.reporter_ref || null,
      text: body.text || '',
      language: body.language || 'auto',
      location: toGeoJson(cleanLoc),
      location_accuracy_m: body.location_accuracy_m ?? null,
      occurred_at: occurredAt,
      media: body.media || [],
      structured: body.structured || null,
      is_simulated: Boolean(body.is_simulated),
      sim_run_id: body.sim_run_id || null,
      processing_status: 'QUEUED',
    });

    // Instantly notify dispatchers in the Alert Center / Notification section
    const alertSeverity = body.structured?.type === 'FIRE_INDUSTRIAL' || body.structured?.type === 'BUILDING_COLLAPSE' || body.structured?.type === 'GAS_LEAK' ? 'CRITICAL' : 'HIGH';
    await raiseAlert({
      type: 'NEW_REPORT',
      severity: alertSeverity,
      title: `Emergency Report: ${(body.structured?.type || 'EMERGENCY').replace(/_/g, ' ')}`,
      body: body.text ? body.text.slice(0, 180) : `Incoming emergency report via ${body.source_type.replace(/_/g, ' ')}.`,
      payload: {
        report_id: reportId,
        source_type: body.source_type,
        source_label: body.source_label,
        location: cleanLoc,
        type: body.structured?.type || 'UNKNOWN',
      },
      dedupe_key: `REPORT_ALERT:${reportId}`,
    });

    await enqueueJob('PROCESS_REPORT', { report_id: reportId });

    res.status(202).json({ data: { report_id: report._id, status: report.processing_status, received_at: report.received_at.toISOString() } });
  } catch (err) { next(err); }
});

ingestRouter.get('/reports', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.incident_id) filter.incident_id = req.query.incident_id;
    if (req.query.status) filter.processing_status = req.query.status;
    if (req.query.since) filter.received_at = { $gte: new Date(req.query.since) };
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const reports = await Report.find(filter).sort({ received_at: -1 }).limit(limit);
    res.json({ data: reports.map(toReportWire), meta: { next_cursor: null, limit } });
  } catch (err) { next(err); }
});

ingestRouter.get('/reports/:id', async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Report not found', request_id: req.requestId } });
    res.json({ data: toReportWire(report) });
  } catch (err) { next(err); }
});

function toReportWire(r) {
  return {
    id: r._id, source_type: r.source_type, source_label: r.source_label, text: r.text,
    language: r.language, location: r.location?.coordinates ? { lng: r.location.coordinates[0], lat: r.location.coordinates[1] } : null,
    location_accuracy_m: r.location_accuracy_m, occurred_at: r.occurred_at.toISOString(),
    received_at: r.received_at.toISOString(), media: r.media, structured: r.structured,
    is_simulated: r.is_simulated, sim_run_id: r.sim_run_id, processing_status: r.processing_status,
    incident_id: r.incident_id, extraction: r.extraction, degraded_steps: r.degraded_steps,
  };
}

export { toReportWire };
