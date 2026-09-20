// The procedural incident spawner — an unbounded, randomized generalization of what
// modules/admin/scenarios.js does by hand for exactly 2 fixed timelines. Every call picks a type
// + location + a burst of 3-7 reports across distinct, plausible sources, spread over roughly a
// minute with realistic jitter and a worsening tone on the later reports — so correlation, belief
// fusion, severity escalation, and dispatch all get exercised continuously without a human
// pressing play.

import { GENERATABLE_TYPES, INCIDENT_PROFILES, buildReportText, sourceLabel, randomReporterRef } from './content.js';
import { randomAnchor, jitterLocation, pick } from './geography.js';
import { ingestSimulatedReport } from './ingest.js';
import { logger } from '../../platform/logger.js';

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildBurstPlan(profile) {
  const sources = shuffle(profile.plausibleSources).slice(0, 3 + Math.floor(Math.random() * Math.min(4, profile.plausibleSources.length - 2)));
  let t = 0;
  return sources.map((sourceType, i) => {
    t += 8 + Math.random() * 22; // 8-30s between reports in the cluster
    return { t: Math.round(t), sourceType, escalate: i >= sources.length - 2 }; // last 1-2 reports read as worsening
  });
}

/**
 * Spawns one correlated multi-source incident cluster. `registerHandle` lets the caller (the
 * engine) track the internal setTimeout handles so a stop() can cancel an in-flight burst.
 */
export function scheduleIncidentCluster(simRunId, registerHandle) {
  const type = pick(GENERATABLE_TYPES);
  const profile = INCIDENT_PROFILES[type];
  const anchor = randomAnchor();
  const plan = buildBurstPlan(profile);

  logger.info({ type, anchor: anchor.name, reports: plan.length, sim_run_id: simRunId }, 'World Engine: spawning incident cluster');

  for (const evt of plan) {
    const handle = setTimeout(async () => {
      try {
        const loc = jitterLocation(anchor.location, 220);
        const text = buildReportText(profile, evt.sourceType, { place: anchor.name, escalate: evt.escalate });
        await ingestSimulatedReport({
          source_type: evt.sourceType, source_label: sourceLabel(evt.sourceType), text, location: loc,
          reporter_ref: randomReporterRef(evt.sourceType), sim_run_id: simRunId, notable: true,
        });
      } catch (err) {
        logger.warn({ err, type }, 'worldengine: cluster event failed');
      }
    }, evt.t * 1000);
    registerHandle?.(handle);
  }
}
