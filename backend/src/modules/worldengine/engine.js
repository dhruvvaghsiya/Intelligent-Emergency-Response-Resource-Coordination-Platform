// Orchestrates the always-on Live World Engine: ambient hum + procedural incident clusters +
// hospital drift + unit heartbeat, each on its own randomized, intensity-scaled timer. Auto-starts
// from server.js when env.SIM_ENABLED (already the default) — this is what makes the platform
// alive without anyone pressing a button, distinct from the 2 hand-scripted signature scenarios in
// modules/admin/scenarios.js, which remain available for a deterministic judge walkthrough.

import { newId } from '../../utils/ids.js';
import { logger } from '../../platform/logger.js';
import { Report } from '../../models/Report.js';
import { tickAmbient } from './ambient.js';
import { scheduleIncidentCluster } from './director.js';
import { tickHospitalFeed } from './hospitalFeed.js';
import { tickUnitHeartbeat } from './unitHeartbeat.js';

const INTENSITY_MIN = 0.25;
const INTENSITY_MAX = 4;

const state = {
  running: false,
  intensity: 1,
  simRunId: null,
  startedAt: null,
  handles: [],
};

function clampIntensity(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 1;
  return Math.max(INTENSITY_MIN, Math.min(INTENSITY_MAX, n));
}

function registerHandle(handle) {
  state.handles.push(handle);
}

/** Self-rescheduling randomized-interval loop — jittered so ticks don't fall into lockstep,
 * intensity-scaled so the admin dial actually speeds/slows the whole city. */
function loop(kind, fn, minMs, maxMs) {
  if (!state.running) return;
  const delay = (minMs + Math.random() * (maxMs - minMs)) / state.intensity;
  const handle = setTimeout(async () => {
    if (!state.running) return;
    try {
      await fn();
    } catch (err) {
      logger.warn({ err, kind }, 'World Engine tick failed');
    }
    loop(kind, fn, minMs, maxMs);
  }, delay);
  registerHandle(handle);
}

export function startWorldEngine({ intensity = 1 } = {}) {
  if (state.running) {
    state.intensity = clampIntensity(intensity);
    return getWorldEngineState();
  }
  state.running = true;
  state.intensity = clampIntensity(intensity);
  state.simRunId = newId('sim');
  state.startedAt = new Date();
  state.handles = [];

  loop('ambient', () => tickAmbient(state.simRunId), 4000, 9000);
  loop('director', () => scheduleIncidentCluster(state.simRunId, registerHandle), 90000, 240000);
  loop('hospital', () => tickHospitalFeed(state.simRunId), 45000, 90000);
  loop('unit_heartbeat', () => tickUnitHeartbeat(), 15000, 25000);

  logger.info({ sim_run_id: state.simRunId, intensity: state.intensity }, 'Live World Engine started');
  return getWorldEngineState();
}

export function stopWorldEngine() {
  state.running = false;
  for (const handle of state.handles) clearTimeout(handle);
  state.handles = [];
  logger.info({ sim_run_id: state.simRunId }, 'Live World Engine stopped');
  const stopped = getWorldEngineState();
  state.simRunId = null;
  state.startedAt = null;
  return stopped;
}

export function getWorldEngineState() {
  return {
    running: state.running,
    intensity: state.intensity,
    sim_run_id: state.simRunId,
    started_at: state.startedAt?.toISOString() ?? null,
  };
}

/** Real per-source counts for the last 5 minutes, straight from the reports collection — no
 * separate in-memory bookkeeping to drift out of sync with the ground truth. */
export async function getWorldEngineStatus() {
  const since = new Date(Date.now() - 5 * 60 * 1000);
  const rows = await Report.aggregate([
    { $match: { received_at: { $gte: since } } },
    { $group: { _id: '$source_type', count: { $sum: 1 } } },
  ]);
  const by_source = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  return { ...getWorldEngineState(), reports_last_5m: rows.reduce((s, r) => s + r.count, 0), by_source };
}
