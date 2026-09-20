// The Live Escalation Monitor — turns 5 alert types that previously only ever existed as
// seed/seed.js's fake rows into alerts computed from real, current state:
// SLA_BREACH, COVERAGE_HOLE, RESOURCE_SHORTAGE, UNIT_UNRESPONSIVE, AI_DEGRADED.
// Runs on a recurring sweep (wired in server.js next to the existing cascade TTL sweep). Every
// check reuses code that already exists — TUNING.alerts.slaSecondsByType was defined and never
// read; computeCoverage() already flags is_hole cells and nothing called it on a loop — this file
// is the missing "watch" loop around already-correct logic, not new algorithms.

import { Incident } from '../../models/Incident.js';
import { Unit } from '../../models/Unit.js';
import { Assignment } from '../../models/Assignment.js';
import { Hospital } from '../../models/Hospital.js';
import { AiCall } from '../../models/AiCall.js';
import { ACTIVE_ASSIGNMENT_STATUSES } from '../../contracts/enums.js';
import { TUNING } from '../../contracts/tuning.js';
import { raiseAlert } from '../alerts/service.js';
import { computeCoverage } from '../coverage/service.js';
import { logger } from '../../platform/logger.js';

const OPEN_STATUSES = ['REPORTED', 'TRIAGED', 'DISPATCHED', 'ON_SCENE', 'CONTAINED'];
const UNIT_STALE_MS = 3 * 60 * 1000;
const HOSPITAL_CRITICAL_BEDS = 2;

async function checkSlaBreaches() {
  const openIncidents = await Incident.find({ status: { $in: OPEN_STATUSES }, severity: { $in: ['CRITICAL', 'HIGH'] } });
  if (!openIncidents.length) return;

  const activeAssignments = await Assignment.find({
    incident_id: { $in: openIncidents.map((i) => i._id) },
    status: { $in: ACTIVE_ASSIGNMENT_STATUSES },
  });
  const dispatchedIncidentIds = new Set(activeAssignments.map((a) => a.incident_id));

  for (const inc of openIncidents) {
    if (dispatchedIncidentIds.has(inc._id)) continue;
    const slaSeconds = TUNING.alerts.slaSecondsByType[inc.type] ?? TUNING.alerts.slaSecondsByType.DEFAULT;
    const elapsedSeconds = (Date.now() - inc.occurred_at.getTime()) / 1000;
    if (elapsedSeconds < slaSeconds) continue;

    await raiseAlert({
      type: 'SLA_BREACH', severity: inc.severity, incident_id: inc._id,
      title: `${inc.code} — no active dispatch ${Math.round(elapsedSeconds / 60)} min after report (SLA ${Math.round(slaSeconds / 60)} min)`,
      body: `Incident is ${inc.status} with no APPROVED/EN_ROUTE/ON_SCENE assignment yet.`,
      payload: { elapsed_seconds: Math.round(elapsedSeconds), sla_seconds: slaSeconds },
      dedupe_key: `SLA_BREACH:${inc._id}`,
    });
  }
}

async function checkCoverageHoles() {
  const cells = await computeCoverage();
  const significant = cells
    .filter((c) => c.is_hole && c.population_weight > 0.15)
    .sort((a, b) => b.population_weight - a.population_weight)
    .slice(0, 3);

  for (const cell of significant) {
    await raiseAlert({
      type: 'COVERAGE_HOLE', severity: cell.population_weight > 0.4 ? 'HIGH' : 'MODERATE',
      title: `Coverage hole at ${cell.cell_id} — best unit ETA exceeds ${Math.round(TUNING.coverage.reachThresholdSeconds / 60)} min`,
      body: cell.t_reach_s
        ? `Best reachable in ${Math.round(cell.t_reach_s / 60)} min; population weight ${cell.population_weight}.`
        : `No unit can currently reach this area; population weight ${cell.population_weight}.`,
      payload: { cell_id: cell.cell_id, centroid: cell.centroid, t_reach_s: cell.t_reach_s, population_weight: cell.population_weight },
      dedupe_key: `COVERAGE_HOLE:${cell.cell_id}`,
    });
  }
}

async function checkResourceShortages() {
  const openIncidents = await Incident.find({ status: { $in: OPEN_STATUSES }, required_capabilities: { $exists: true, $not: { $size: 0 } } });
  if (openIncidents.length) {
    const neededCapabilities = new Set(openIncidents.flatMap((i) => i.required_capabilities));
    const availableUnits = await Unit.find({ status: 'AVAILABLE' });
    const availableCapabilities = new Set(availableUnits.flatMap((u) => u.capabilities));

    for (const capability of neededCapabilities) {
      if (availableCapabilities.has(capability)) continue;
      const affected = openIncidents.filter((i) => i.required_capabilities.includes(capability));
      const worst = affected.slice().sort((a, b) => b.severity_score - a.severity_score)[0];
      await raiseAlert({
        type: 'RESOURCE_SHORTAGE', severity: worst.severity, incident_id: worst._id,
        title: `No AVAILABLE unit citywide with ${capability} — ${affected.length} open incident(s) need it`,
        body: `Capability shortage affecting ${affected.map((i) => i.code).join(', ')}.`,
        payload: { capability, affected_incident_ids: affected.map((i) => i._id) },
        dedupe_key: `RESOURCE_SHORTAGE:CAPABILITY:${capability}`,
      });
    }
  }

  const criticalHospitals = await Hospital.find({ beds_available: { $lte: HOSPITAL_CRITICAL_BEDS } });
  for (const h of criticalHospitals) {
    await raiseAlert({
      type: 'RESOURCE_SHORTAGE', severity: 'HIGH',
      title: `${h.name} critically low on capacity — ${h.beds_available} bed(s) / ${h.icu_available} ICU remaining`,
      body: 'Hospital bed capacity has dropped to a critical level.',
      payload: { hospital_id: h._id, beds_available: h.beds_available, icu_available: h.icu_available },
      dedupe_key: `RESOURCE_SHORTAGE:HOSPITAL:${h._id}`,
    });
  }
}

async function checkUnresponsiveUnits() {
  const cutoff = new Date(Date.now() - UNIT_STALE_MS);
  const staleUnits = await Unit.find({ status: { $nin: ['OFFLINE', 'OUT_OF_SERVICE'] }, last_location_at: { $lt: cutoff } });

  for (const u of staleUnits) {
    const staleMinutes = Math.round((Date.now() - u.last_location_at.getTime()) / 60000);
    await raiseAlert({
      type: 'UNIT_UNRESPONSIVE', severity: 'MODERATE', unit_id: u._id,
      title: `${u.call_sign} unresponsive — no location update in ${staleMinutes} min`,
      body: `Unit status is ${u.status} but has not reported a location update.`,
      payload: { unit_id: u._id, stale_minutes: staleMinutes },
      dedupe_key: `UNIT_UNRESPONSIVE:${u._id}`,
    });
  }
}

async function checkAiDegraded() {
  const since = new Date(Date.now() - 5 * 60 * 1000);
  const recent = await AiCall.find({ created_at: { $gte: since } });
  if (!recent.length) return;

  const failures = recent.filter((c) => !c.ok).length;
  const degraded = recent.filter((c) => c.degraded).length;
  // a call can be both !ok and degraded (fallback itself failed) — count each call once so the
  // rate can't exceed 100%.
  const affected = recent.filter((c) => !c.ok || c.degraded).length;
  const rate = affected / recent.length;
  if (rate < 0.4) return;

  await raiseAlert({
    type: 'AI_DEGRADED', severity: rate > 0.75 ? 'HIGH' : 'MODERATE',
    title: `AI sidecar degraded — ${Math.round(rate * 100)}% of calls falling back in the last 5 min`,
    body: `${failures} failed, ${degraded} degraded out of ${recent.length} AI calls.`,
    payload: { fallback_rate: Math.round(rate * 1000) / 1000, calls: recent.length },
    dedupe_key: 'AI_DEGRADED',
  });
}

const CHECKS = [
  ['SLA_BREACH', checkSlaBreaches],
  ['COVERAGE_HOLE', checkCoverageHoles],
  ['RESOURCE_SHORTAGE', checkResourceShortages],
  ['UNIT_UNRESPONSIVE', checkUnresponsiveUnits],
  ['AI_DEGRADED', checkAiDegraded],
];

export async function runEscalationSweep() {
  for (const [name, fn] of CHECKS) {
    try {
      await fn();
    } catch (err) {
      logger.warn({ err, check: name }, 'escalation monitor check failed — continuing');
    }
  }
}
