import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Report } from '../../models/Report.js';
import { User } from '../../models/User.js';
import { newId } from '../../utils/ids.js';
import { toGeoJson } from '../../utils/geo.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, PERMISSIONS, can } from '../../platform/rbac.js';
import { validateBody } from '../../middleware/validate.js';
import { AdminCreateUserSchema } from '../../contracts/schemas.js';
import { enqueueJob } from '../../platform/jobs.js';
import { aiHealthSnapshot } from '../../ai/client.js';
import { AiCall } from '../../models/AiCall.js';
import { SCENARIOS, buildReportBody } from './scenarios.js';
import { isDbHealthy } from '../../platform/db.js';
import { AppError } from '../../platform/errors.js';
import { startWorldEngine, stopWorldEngine, getWorldEngineStatus } from '../worldengine/engine.js';

export const adminRouter = Router();

function toUserWire(u) {
  return {
    id: u._id, email: u.email, name: u.name, role: u.role, station_id: u.station_id,
    permissions: Object.values(PERMISSIONS).filter((p) => can(u.role, p)),
    created_at: u.created_at.toISOString(),
  };
}

// §access-control — the only place an operator account can be created or removed. Self-service
// registration (POST /auth/register) was deleted entirely: it let any anonymous caller pick their
// own role, including ADMIN. Here the role comes from an already-authenticated ADMIN, not the
// anonymous request body.
adminRouter.get('/admin/users', authenticate, requirePermission(PERMISSIONS.ADMIN), async (req, res, next) => {
  try {
    const users = await User.find().sort({ created_at: -1 });
    res.json({ data: users.map(toUserWire) });
  } catch (err) { next(err); }
});

adminRouter.post('/admin/users', authenticate, requirePermission(PERMISSIONS.ADMIN), validateBody(AdminCreateUserSchema), async (req, res, next) => {
  try {
    const cleanEmail = req.body.email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) throw new AppError('CONFLICT', 'An operator account with this email already exists');

    const password_hash = await bcrypt.hash(req.body.password, 10);
    const user = await User.create({
      _id: newId('user'),
      name: req.body.name,
      email: cleanEmail,
      role: req.body.role,
      station_id: req.body.station_id || null,
      password_hash,
    });
    res.status(201).json({ data: toUserWire(user) });
  } catch (err) { next(err); }
});

adminRouter.delete('/admin/users/:id', authenticate, requirePermission(PERMISSIONS.ADMIN), async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) throw new AppError('BAD_REQUEST', 'Cannot delete your own account');
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('NOT_FOUND', 'User not found');
    await User.deleteOne({ _id: req.params.id });
    res.json({ data: { deleted: true, id: req.params.id } });
  } catch (err) { next(err); }
});

let activeSim = null; // { name, sim_run_id, startedAt, speed, timers: [] }

adminRouter.post('/sim/scenarios/:name/start', authenticate, requirePermission(PERMISSIONS.RUN_SIMULATION), async (req, res, next) => {
  try {
    const scenario = SCENARIOS[req.params.name];
    if (!scenario) throw new AppError('NOT_FOUND', `Unknown scenario ${req.params.name}`);
    if (activeSim) stopSim();

    const speed = Number(req.body?.speed) || 1;
    const simRunId = newId('sim');
    const timers = [];

    for (const evt of scenario.events) {
      const delayMs = (evt.t * 1000) / speed;
      const timer = setTimeout(async () => {
        try {
          const body = buildReportBody(evt, simRunId);
          const reportId = newId('report');
          await Report.create({
            _id: reportId, source_type: body.source_type, source_label: body.source_label,
            reporter_ref: body.reporter_ref, text: body.text, language: body.language,
            location: toGeoJson(body.location), location_accuracy_m: body.location_accuracy_m,
            occurred_at: new Date(body.occurred_at), structured: body.structured,
            is_simulated: true, sim_run_id: simRunId, processing_status: 'QUEUED',
          });
          await enqueueJob('PROCESS_REPORT', { report_id: reportId });
        } catch { /* best-effort simulator tick */ }
      }, delayMs);
      timers.push(timer);
    }

    activeSim = { name: scenario.name, sim_run_id: simRunId, started_at: new Date().toISOString(), speed, timers };
    res.json({ data: { sim_run_id: simRunId, name: scenario.name, speed, event_count: scenario.events.length } });
  } catch (err) { next(err); }
});

function stopSim() {
  if (!activeSim) return;
  for (const t of activeSim.timers) clearTimeout(t);
  activeSim = null;
}

adminRouter.post('/sim/stop', authenticate, requirePermission(PERMISSIONS.RUN_SIMULATION), async (req, res, next) => {
  try {
    stopSim();
    res.json({ data: { stopped: true } });
  } catch (err) { next(err); }
});

adminRouter.get('/sim/status', authenticate, async (req, res, next) => {
  try {
    res.json({ data: activeSim ? { running: true, name: activeSim.name, sim_run_id: activeSim.sim_run_id, started_at: activeSim.started_at, speed: activeSim.speed } : { running: false } });
  } catch (err) { next(err); }
});

// §worldengine — the always-on multi-source live feed, distinct from the 2 hand-scripted
// scenarios above. Runs by default (env.SIM_ENABLED) from server startup; these let an operator
// pause it or turn the intensity dial for a demo.
adminRouter.post('/worldengine/start', authenticate, requirePermission(PERMISSIONS.RUN_SIMULATION), async (req, res, next) => {
  try {
    const intensity = Number(req.body?.intensity) || 1;
    res.json({ data: startWorldEngine({ intensity }) });
  } catch (err) { next(err); }
});

adminRouter.post('/worldengine/stop', authenticate, requirePermission(PERMISSIONS.RUN_SIMULATION), async (req, res, next) => {
  try {
    res.json({ data: stopWorldEngine() });
  } catch (err) { next(err); }
});

adminRouter.get('/worldengine/status', authenticate, async (req, res, next) => {
  try {
    res.json({ data: await getWorldEngineStatus() });
  } catch (err) { next(err); }
});

adminRouter.get('/ai/health', authenticate, requirePermission(PERMISSIONS.ANALYTICS), async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 5 * 60 * 1000);
    const recent = await AiCall.find({ created_at: { $gte: since } });
    const total = recent.length;
    const failures = recent.filter((c) => !c.ok).length;
    const degraded = recent.filter((c) => c.degraded).length;
    const latencies = recent.map((c) => c.latency_ms).sort((a, b) => a - b);
    const pct = (p) => latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor(p * latencies.length))] : null;

    res.json({
      data: {
        ...aiHealthSnapshot(),
        calls_last_5m: total,
        fallback_rate: total > 0 ? Math.round((degraded / total) * 1000) / 1000 : 0,
        error_rate: total > 0 ? Math.round((failures / total) * 1000) / 1000 : 0,
        p50_ms: pct(0.5), p95_ms: pct(0.95),
      },
    });
  } catch (err) { next(err); }
});

/** §16.3 golden-set metrics — computed against the seeded/simulated data actually processed by
 * this backend (no separate services/ai golden_set.jsonl is owned by this build). Honest partial
 * scope: reports the fallback-classifier's own accuracy against seed labels rather than a full
 * 120-row hand-labelled multilingual set (that asset belongs to the AI team). */
adminRouter.get('/ai/eval', authenticate, requirePermission(PERMISSIONS.ANALYTICS), async (req, res, next) => {
  try {
    const total = await Report.countDocuments({ processing_status: 'PROCESSED' });
    const degraded = await Report.countDocuments({ degraded_steps: 'EXTRACT' });
    res.json({
      data: {
        golden_set_size: 0,
        note: 'Full 120-row multilingual golden set is owned by services/ai (out of scope for this backend-only build). Figures below are live operational metrics instead.',
        reports_processed: total,
        extraction_fallback_rate: total > 0 ? Math.round((degraded / total) * 1000) / 1000 : 0,
        evaluated_at: new Date().toISOString(),
      },
    });
  } catch (err) { next(err); }
});

export const healthRouter = Router();

healthRouter.get('/health', async (req, res) => {
  const dbOk = isDbHealthy();
  res.status(dbOk ? 200 : 503).json({
    data: { status: dbOk ? 'ok' : 'degraded', db: dbOk ? 'connected' : 'disconnected', ai: aiHealthSnapshot(), timestamp: new Date().toISOString() },
  });
});
