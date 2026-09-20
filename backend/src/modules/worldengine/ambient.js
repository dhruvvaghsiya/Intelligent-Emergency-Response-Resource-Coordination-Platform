// The "always alive" background layer: a small fixed grid of IoT sensors + CCTV cameras that tick
// continuously (mostly normal readings, rare anomaly blips), plus occasional social/citizen
// chatter that amplifies whatever incident is currently active — so the correlation engine has
// real continuous multi-source noise to sort through, not just director-spawned bursts.

import { Incident } from '../../models/Incident.js';
import { toWirePoint } from '../../utils/geo.js';
import { ingestSimulatedReport } from './ingest.js';
import { ANCHORS, jitterLocation, pick } from './geography.js';
import { INCIDENT_PROFILES, buildReportText, sensorStructured, cctvStructured, sourceLabel } from './content.js';

// Fixed sensor/camera deployment — a handful per anchor, each locked to a plausible hazard type
// for that location so anomalies make physical sense (e.g. water-level sensors near the
// riverfront, heat sensors in the industrial zone).
const SENSOR_TYPE_BY_ANCHOR = {
  'Sabarmati Riverfront': 'FLOOD', 'Maninagar': 'WATERLOGGING', 'Vatva GIDC': 'FIRE_INDUSTRIAL',
  'Navrangpura': 'FIRE_STRUCTURE', 'Bopal': 'ELECTRICAL_HAZARD', 'Chandkheda': 'GAS_LEAK',
  'Ellis Bridge': 'FLOOD', 'SG Highway': 'ROAD_ACCIDENT', 'Naroda': 'FIRE_INDUSTRIAL', 'Paldi': 'FIRE_STRUCTURE',
};

const ANOMALY_RATE = 0.06; // per ambient tick, chance the picked sensor/camera reads anomalous

function anchorFor(name) {
  return ANCHORS.find((a) => a.name === name) || pick(ANCHORS);
}

async function tickSensor(simRunId) {
  const anchorName = pick(Object.keys(SENSOR_TYPE_BY_ANCHOR));
  const type = SENSOR_TYPE_BY_ANCHOR[anchorName];
  const profile = INCIDENT_PROFILES[type];
  if (!profile?.sensor) return;
  const anchor = anchorFor(anchorName);
  const anomalous = Math.random() < ANOMALY_RATE;
  const structured = sensorStructured(profile, anomalous);
  const loc = jitterLocation(anchor.location, 250);
  const text = anomalous
    ? `Sensor ${structured.sensor_id} reading ${structured.value}${structured.unit} — above normal range near ${anchor.name}.`
    : `Routine telemetry: sensor ${structured.sensor_id} nominal (${structured.value}${structured.unit}) near ${anchor.name}.`;
  await ingestSimulatedReport({
    source_type: 'IOT_SENSOR', source_label: sourceLabel('IOT_SENSOR'), text, location: loc,
    structured, sim_run_id: simRunId, notable: anomalous,
  });
}

async function tickCctv(simRunId) {
  const candidates = Object.keys(SENSOR_TYPE_BY_ANCHOR).filter((n) => INCIDENT_PROFILES[SENSOR_TYPE_BY_ANCHOR[n]]?.cctv);
  if (!candidates.length) return;
  const anchorName = pick(candidates);
  const type = SENSOR_TYPE_BY_ANCHOR[anchorName];
  const profile = INCIDENT_PROFILES[type];
  const anchor = anchorFor(anchorName);
  const anomalous = Math.random() < ANOMALY_RATE;
  const structured = cctvStructured(profile, anomalous);
  const loc = jitterLocation(anchor.location, 150);
  const text = anomalous
    ? `CCTV analytics flagged "${structured.detection}" (confidence ${structured.confidence}) near ${anchor.name}.`
    : `CCTV analytics: no anomaly detected near ${anchor.name}.`;
  await ingestSimulatedReport({
    source_type: 'CCTV_ANALYTICS', source_label: sourceLabel('CCTV_ANALYTICS'), text, location: loc,
    structured, sim_run_id: simRunId, notable: anomalous,
  });
}

const OPEN_STATUSES = ['REPORTED', 'TRIAGED', 'DISPATCHED', 'ON_SCENE', 'CONTAINED'];
const CHATTER_SOURCES = ['SOCIAL_MEDIA', 'CITIZEN_APP', 'CITIZEN_SMS'];

/** Amplifies a currently-open incident with an extra citizen/social report — real continuous
 * multi-source noise around an event already in progress, exercising correlation on every tick
 * rather than only when the director spawns something new. */
async function tickChatter(simRunId) {
  const recent = await Incident.find({
    status: { $in: OPEN_STATUSES },
    updated_at: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
  }).sort({ updated_at: -1 }).limit(5);
  if (!recent.length) return;

  const incident = pick(recent);
  const profile = INCIDENT_PROFILES[incident.type];
  if (!profile) return;
  const eligible = profile.plausibleSources.filter((s) => CHATTER_SOURCES.includes(s));
  if (!eligible.length) return;

  const sourceType = pick(eligible);
  const anchorLoc = toWirePoint(incident.location) || pick(ANCHORS).location;
  const loc = jitterLocation(anchorLoc, 200);
  const text = buildReportText(profile, sourceType, { place: incident.ward || incident.title.split(' — ')[0], escalate: Math.random() < 0.25 });

  await ingestSimulatedReport({
    source_type: sourceType, source_label: sourceLabel(sourceType), text, location: loc,
    sim_run_id: simRunId, notable: false,
  });
}

/** One ambient tick — called on a timer by the engine. Weighted so sensors/cameras hum most
 * often, chatter around active incidents happens less often but still continuously. */
export async function tickAmbient(simRunId) {
  const roll = Math.random();
  if (roll < 0.42) return tickSensor(simRunId);
  if (roll < 0.72) return tickCctv(simRunId);
  return tickChatter(simRunId);
}
