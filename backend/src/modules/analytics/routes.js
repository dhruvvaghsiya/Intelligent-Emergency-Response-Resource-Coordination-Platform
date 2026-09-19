// §28 ANALYTICS — operational KPIs computed directly from seeded/live data. Reporting surface
// only (poll-on-view, §18.1) — never realtime.

import { Router } from 'express';
import { Incident } from '../../models/Incident.js';
import { Report } from '../../models/Report.js';
import { Assignment } from '../../models/Assignment.js';
import { IncidentLink } from '../../models/IncidentLink.js';
import { Unit } from '../../models/Unit.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, PERMISSIONS } from '../../platform/rbac.js';

export const analyticsRouter = Router();

analyticsRouter.get('/analytics/overview', authenticate, requirePermission(PERMISSIONS.ANALYTICS), async (req, res, next) => {
  try {
    const [incidentCount, reportCount, severityBreakdown, statusBreakdown, mergedCount, overrideCount] = await Promise.all([
      Incident.countDocuments({}),
      Report.countDocuments({}),
      Incident.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]),
      Incident.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Incident.countDocuments({ status: 'MERGED' }),
      Incident.countDocuments({ 'severity_assessment.overridden_by': { $ne: null } }),
    ]);

    res.json({
      data: {
        incident_count: incidentCount,
        report_count: reportCount,
        duplicate_compression_ratio: incidentCount > 0 ? Math.round((reportCount / incidentCount) * 100) / 100 : 0,
        severity_breakdown: Object.fromEntries(severityBreakdown.map((s) => [s._id, s.count])),
        status_breakdown: Object.fromEntries(statusBreakdown.map((s) => [s._id, s.count])),
        merged_incident_count: mergedCount,
        model_operator_disagreement_rate: incidentCount > 0 ? Math.round((overrideCount / incidentCount) * 1000) / 1000 : 0,
      },
    });
  } catch (err) { next(err); }
});

analyticsRouter.get('/analytics/response-times', authenticate, requirePermission(PERMISSIONS.ANALYTICS), async (req, res, next) => {
  try {
    const assignments = await Assignment.find({ arrived_at: { $ne: null } });
    const incidents = await Incident.find({ _id: { $in: assignments.map((a) => a.incident_id) } });
    const incidentById = new Map(incidents.map((i) => [i._id, i]));

    const byType = {};
    for (const a of assignments) {
      const incident = incidentById.get(a.incident_id);
      if (!incident) continue;
      const responseSeconds = (a.arrived_at.getTime() - incident.occurred_at.getTime()) / 1000;
      byType[incident.type] = byType[incident.type] || [];
      byType[incident.type].push(responseSeconds);
    }

    const histogram = Object.fromEntries(Object.entries(byType).map(([type, values]) => {
      const sorted = [...values].sort((x, y) => x - y);
      const pct = (p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : null;
      return [type, { count: sorted.length, p50_s: pct(0.5), p90_s: pct(0.9) }];
    }));

    res.json({ data: histogram });
  } catch (err) { next(err); }
});

analyticsRouter.get('/analytics/utilization', authenticate, requirePermission(PERMISSIONS.ANALYTICS), async (req, res, next) => {
  try {
    const units = await Unit.find();
    const active = await Assignment.aggregate([
      { $match: { status: { $in: ['APPROVED', 'EN_ROUTE', 'ON_SCENE'] } } },
      { $group: { _id: '$unit_id', count: { $sum: 1 } } },
    ]);
    const activeByUnit = new Map(active.map((a) => [a._id, a.count]));

    const byType = {};
    for (const u of units) {
      byType[u.type] = byType[u.type] || { total: 0, busy: 0 };
      byType[u.type].total += 1;
      if (activeByUnit.get(u._id)) byType[u.type].busy += 1;
    }
    const utilization = Object.fromEntries(Object.entries(byType).map(([type, v]) => [type, { total: v.total, busy: v.busy, ratio: v.total ? Math.round((v.busy / v.total) * 1000) / 1000 : 0 }]));
    res.json({ data: utilization });
  } catch (err) { next(err); }
});

analyticsRouter.get('/analytics/shortages', authenticate, requirePermission(PERMISSIONS.ANALYTICS), async (req, res, next) => {
  try {
    const holesByWard = await Incident.aggregate([
      { $match: { ward: { $ne: null }, severity: { $in: ['CRITICAL', 'HIGH'] } } },
      { $group: { _id: '$ward', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ data: holesByWard.map((w) => ({ ward: w._id, high_severity_incident_count: w.count })) });
  } catch (err) { next(err); }
});

analyticsRouter.get('/analytics/recommendations', authenticate, requirePermission(PERMISSIONS.ANALYTICS), async (req, res, next) => {
  try {
    const total = await IncidentLink.countDocuments({ relation: { $in: ['DUPLICATE_OF', 'LIKELY_SAME_AS'] } });
    const confirmed = await IncidentLink.countDocuments({ relation: { $in: ['DUPLICATE_OF', 'LIKELY_SAME_AS'] }, confirmed: true });
    res.json({ data: { total_suggestions: total, confirmed, acceptance_rate: total > 0 ? Math.round((confirmed / total) * 1000) / 1000 : 0 } });
  } catch (err) { next(err); }
});
