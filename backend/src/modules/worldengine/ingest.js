// Shared "create a simulated report" primitive — the world engine's only door into the real
// system. Deliberately mirrors modules/admin/routes.js's scenario timer body: Report.create() +
// enqueueJob('PROCESS_REPORT', ...), so a world-engine report is indistinguishable, pipeline-wise,
// from one submitted through POST /reports. Every call is tagged is_simulated + sim_run_id.

import { Report } from '../../models/Report.js';
import { newId } from '../../utils/ids.js';
import { toGeoJson } from '../../utils/geo.js';
import { enqueueJob } from '../../platform/jobs.js';
import { appendEvent } from '../../platform/events.js';
import { logger } from '../../platform/logger.js';

export async function ingestSimulatedReport({
  source_type, source_label, text = '', location, structured = null, reporter_ref = null,
  sim_run_id, notable = false, headline = null,
}) {
  try {
    const reportId = newId('report');
    await Report.create({
      _id: reportId,
      source_type,
      source_label,
      reporter_ref,
      text,
      language: 'auto',
      location: toGeoJson(location),
      location_accuracy_m: 40 + Math.round(Math.random() * 80),
      occurred_at: new Date(),
      structured,
      is_simulated: true,
      sim_run_id,
      processing_status: 'QUEUED',
    });
    await enqueueJob('PROCESS_REPORT', { report_id: reportId });

    // Lightweight, pipeline-independent event so the frontend can show source activity the
    // instant a report lands, without waiting for extraction/correlation to finish.
    await appendEvent({
      room: 'ops:global',
      type: 'report.ingested',
      entity: { kind: 'report', id: reportId },
      actor: { kind: 'SYSTEM' },
      payload: { report_id: reportId, source_type, source_label, notable, headline: headline ?? (text ? text.slice(0, 90) : null) },
    });

    return reportId;
  } catch (err) {
    logger.warn({ err, source_type }, 'worldengine: failed to ingest simulated report');
    return null;
  }
}
