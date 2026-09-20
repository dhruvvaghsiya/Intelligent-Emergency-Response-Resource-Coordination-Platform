// §13.8 canonical fixtures + §17 "pnpm db:seed is idempotent and deterministic; db:reset gets us
// back to a known demo state in <10s." Run: `npm run seed` or `npm run db:reset` (drops first).

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from '../platform/db.js';
import { logger } from '../platform/logger.js';
import { newId } from '../utils/ids.js';
import { toGeoJson } from '../utils/geo.js';

import { User } from '../models/User.js';
import { Station } from '../models/Station.js';
import { Unit } from '../models/Unit.js';
import { Hospital } from '../models/Hospital.js';
import { RoadSegment } from '../models/RoadSegment.js';
import { Counter } from '../models/Counter.js';
import { Incident } from '../models/Incident.js';
import { Evidence } from '../models/Evidence.js';
import { Report } from '../models/Report.js';
import { IncidentLink } from '../models/IncidentLink.js';
import { MergeJournal } from '../models/MergeJournal.js';
import { Assignment } from '../models/Assignment.js';
import { DispatchPlan } from '../models/DispatchPlan.js';
import { Alert } from '../models/Alert.js';
import { EventLog } from '../models/EventLog.js';
import { Outbox } from '../models/Outbox.js';
import { Job } from '../models/Job.js';
import { AuditLog } from '../models/AuditLog.js';
import { AiCall } from '../models/AiCall.js';
import { IdempotencyKey } from '../models/IdempotencyKey.js';
import { Lock } from '../models/Lock.js';
import { CoverageCell } from '../models/CoverageCell.js';

import { createIncident, patchIncidentStatus } from '../modules/incidents/service.js';
import { appendEvidenceBatch } from '../modules/evidence/service.js';
import { deriveAndPersistRequirements, generatePlans, approvePlan, manualAssign, updateAssignmentStatus } from '../modules/dispatch/service.js';
import { mergeIncidents, createLink } from '../modules/correlation/service.js';
import { raiseAlert, ackAlert } from '../modules/alerts/service.js';

const RESET = process.argv.includes('--reset');

const AHMEDABAD = { lng: 72.5797, lat: 23.0225 };

async function reset() {
  const models = [User, Station, Unit, Hospital, RoadSegment, Counter, Incident, Evidence, Report,
    IncidentLink, MergeJournal, Assignment, DispatchPlan, Alert, EventLog, Outbox, Job, AuditLog,
    AiCall, IdempotencyKey, Lock, CoverageCell];
  for (const m of models) await m.deleteMany({});
  logger.info('All collections cleared');
}

async function seedUsers() {
  // Single-role system — everyone else is an anonymous public viewer (see platform/rbac.js);
  // this is the one account that can sign in and do anything.
  const users = [
    { email: 'admin@prahari.in', name: 'System Admin', role: 'ADMIN' },
  ];
  const password_hash = await bcrypt.hash('prahari123', 10);
  for (const u of users) {
    await User.findOneAndUpdate(
      { email: u.email },
      { $set: { name: u.name, role: u.role, password_hash }, $setOnInsert: { _id: newId('user') } },
      { upsert: true }
    );
  }
  logger.info('Seeded %d users (password: prahari123)', users.length);
}

async function seedStations() {
  const stations = [
    { name: 'Central Fire Station', location: { lng: 72.5797, lat: 23.0225 } },
    { name: 'Maninagar Station', location: { lng: 72.6100, lat: 22.9950 } },
    { name: 'Vatva Industrial Station', location: { lng: 72.6281, lat: 22.9872 } },
    { name: 'Navrangpura Station', location: { lng: 72.5600, lat: 23.0350 } },
    { name: 'Bopal Station', location: { lng: 72.4700, lat: 23.0350 } },
    { name: 'Chandkheda Station', location: { lng: 72.5900, lat: 23.1000 } },
  ];
  const docs = [];
  for (const s of stations) {
    const id = newId('station');
    docs.push(await Station.findOneAndUpdate({ name: s.name }, { $setOnInsert: { _id: id, name: s.name, location: toGeoJson(s.location) } }, { upsert: true, new: true }));
  }
  logger.info('Seeded %d stations', docs.length);
  return docs;
}

async function seedUnits(stations) {
  const spec = [
    ['A-01', 'AMBULANCE_BLS', ['MEDICAL_BASIC']], ['A-02', 'AMBULANCE_BLS', ['MEDICAL_BASIC']],
    ['A-03', 'AMBULANCE_BLS', ['MEDICAL_BASIC']], ['A-07', 'AMBULANCE_ALS', ['MEDICAL_ADVANCED', 'MEDICAL_BASIC']],
    ['FE-01', 'FIRE_ENGINE', ['FIRE_SUPPRESSION']], ['FE-02', 'FIRE_ENGINE', ['FIRE_SUPPRESSION']],
    ['FE-03', 'FIRE_ENGINE', ['FIRE_SUPPRESSION']], ['FL-01', 'FIRE_LADDER', ['FIRE_SUPPRESSION', 'HIGH_RISE_ACCESS']],
    ['HZ-01', 'HAZMAT', ['HAZMAT_CONTAINMENT']], ['RT-01', 'RESCUE_TECHNICAL', ['EXTRICATION', 'HEAVY_LIFT']],
    ['RT-02', 'RESCUE_TECHNICAL', ['EXTRICATION']], ['PP-01', 'POLICE_PATROL', ['CROWD_CONTROL']],
    ['PP-02', 'POLICE_PATROL', ['CROWD_CONTROL']], ['WR-01', 'WATER_RESCUE', ['WATER_RESCUE']],
  ];
  let stationIndex = 0;
  const docs = [];
  for (const [call_sign, type, capabilities] of spec) {
    const station = stations[stationIndex % stations.length];
    stationIndex += 1;
    const jitter = () => (Math.random() - 0.5) * 0.02;
    const loc = { lng: station.location.coordinates[0] + jitter(), lat: station.location.coordinates[1] + jitter() };
    const doc = await Unit.findOneAndUpdate(
      { call_sign },
      { $setOnInsert: { _id: newId('unit'), call_sign, type, capabilities, status: 'AVAILABLE', station_id: station._id, location: toGeoJson(loc), crew_size: type.startsWith('AMBULANCE') ? 2 : 4, is_simulated: true } },
      { upsert: true, new: true },
    );
    docs.push(doc);
  }
  logger.info('Seeded %d units', docs.length);
  return docs;
}

async function seedHospitals() {
  const hospitals = [
    { name: 'Civil Hospital Ahmedabad', location: { lng: 72.6369, lat: 23.0469 }, beds_total: 400, beds_available: 62, icu_available: 6, specialities: ['TRAUMA', 'BURNS', 'CARDIAC'] },
    { name: 'VS Hospital', location: { lng: 72.5827, lat: 23.0176 }, beds_total: 250, beds_available: 30, icu_available: 3, specialities: ['TRAUMA', 'GENERAL'] },
    { name: 'Sola Civil Hospital', location: { lng: 72.5200, lat: 23.0850 }, beds_total: 300, beds_available: 45, icu_available: 4, specialities: ['GENERAL', 'PEDIATRIC'] },
    { name: 'Apollo Hospital', location: { lng: 72.5100, lat: 23.0300 }, beds_total: 180, beds_available: 20, icu_available: 5, specialities: ['CARDIAC', 'TRAUMA'] },
    { name: 'Zydus Hospital', location: { lng: 72.5050, lat: 23.1100 }, beds_total: 220, beds_available: 25, icu_available: 4, specialities: ['GENERAL', 'BURNS'] },
    { name: 'Sterling Hospital', location: { lng: 72.5550, lat: 23.0100 }, beds_total: 200, beds_available: 18, icu_available: 2, specialities: ['GENERAL'] },
  ];
  const docs = [];
  for (const h of hospitals) {
    docs.push(await Hospital.findOneAndUpdate({ name: h.name }, { $setOnInsert: { _id: newId('hospital'), ...h, location: toGeoJson(h.location), is_simulated: true } }, { upsert: true, new: true }));
  }
  logger.info('Seeded %d hospitals', docs.length);
  return docs;
}

async function seedRoadSegments() {
  const segments = [
    { name: 'Riverfront Road (Sabarmati)', from: [72.575, 23.020], to: [72.584, 23.025] },
    { name: 'Maninagar Underpass Road', from: [72.605, 22.992], to: [72.615, 22.998] },
    { name: 'Vatva Industrial Access Road', from: [72.624, 22.985], to: [72.632, 22.989] },
  ];
  const docs = [];
  for (const s of segments) {
    const geometry = { type: 'LineString', coordinates: [s.from, s.to] };
    docs.push(await RoadSegment.findOneAndUpdate({ name: s.name }, { $setOnInsert: { _id: newId('road'), name: s.name, geometry, base_speed_mps: 11 } }, { upsert: true, new: true }));
  }
  logger.info('Seeded %d road segments', docs.length);
}

async function seedDemoIncidents() {
  const existing = await Incident.countDocuments({});
  if (existing > 0) {
    logger.info('Incidents already present — skipping demo incident seed');
    return;
  }

  // Incident 1: a clean HIGH severity fire, single confirming source.
  const fire = await createIncident({
    type: 'FIRE_STRUCTURE', title: 'Structure fire — commercial building, Navrangpura',
    description: 'Reported fire in a commercial building.', location: { lng: 72.5620, lat: 23.0360 },
    address: 'C.G. Road, Navrangpura', ward: 'Navrangpura', occurred_at: new Date().toISOString(),
    is_simulated: true,
  });
  await appendEvidenceBatch(fire._id, [
    { source_type: 'EMERGENCY_CALL', source_label: 'Emergency call +91••••2201', attribute: 'fire_active', claimed_value: true, asserted_probability: 0.9, extraction_confidence: 0.85, observed_at: new Date().toISOString(), is_simulated: true },
    { source_type: 'EMERGENCY_CALL', source_label: 'Emergency call +91••••2201', attribute: 'smoke_heavy', claimed_value: true, asserted_probability: 0.8, extraction_confidence: 0.8, observed_at: new Date().toISOString(), is_simulated: true },
  ]);
  await deriveAndPersistRequirements(fire._id);

  // Incident 2: the pre-built CONTESTED case (§13.8) — citizen says trapped, field officer disagrees.
  const contested = await createIncident({
    type: 'FIRE_INDUSTRIAL', title: 'Industrial fire — Vatva chemical unit',
    description: 'Reported industrial fire with conflicting trapped-persons claims.', location: { lng: 72.6281, lat: 22.9872 },
    address: 'Vatva GIDC', ward: 'Vatva', occurred_at: new Date().toISOString(), is_simulated: true,
  });
  await appendEvidenceBatch(contested._id, [
    { source_type: 'EMERGENCY_CALL', source_label: 'Emergency call +91••••8890', attribute: 'people_trapped', claimed_value: true, asserted_probability: 0.9, extraction_confidence: 0.85, observed_at: new Date().toISOString(), is_simulated: true },
    { source_type: 'CITIZEN_APP', source_label: 'Citizen app +91••••1123', attribute: 'people_trapped', claimed_value: true, asserted_probability: 0.85, extraction_confidence: 0.8, observed_at: new Date().toISOString(), is_simulated: true },
    { source_type: 'FIELD_UNIT', source_label: 'Field unit FE-02', attribute: 'people_trapped', claimed_value: false, asserted_probability: 0.1, extraction_confidence: 0.9, observed_at: new Date().toISOString(), is_simulated: true },
    { source_type: 'FIELD_UNIT', source_label: 'Field unit FE-02', attribute: 'chemical_hazard', claimed_value: true, asserted_probability: 0.7, extraction_confidence: 0.85, observed_at: new Date().toISOString(), is_simulated: true },
  ]);
  await deriveAndPersistRequirements(contested._id);

  // Incident 3: a road accident, MODERATE, for demo variety.
  const accident = await createIncident({
    type: 'ROAD_ACCIDENT', title: 'Multi-vehicle collision — SG Highway',
    description: 'Reported collision with minor injuries.', location: { lng: 72.5100, lat: 23.0500 },
    address: 'SG Highway', ward: 'Bodakdev', occurred_at: new Date().toISOString(), is_simulated: true,
  });
  await appendEvidenceBatch(accident._id, [
    { source_type: 'CITIZEN_APP', source_label: 'Citizen app +91••••4432', attribute: 'casualties_reported', claimed_value: true, asserted_probability: 0.6, extraction_confidence: 0.7, observed_at: new Date().toISOString(), is_simulated: true },
  ]);
  await deriveAndPersistRequirements(accident._id);

  logger.info('Seeded 3 demo incidents (1 CONTESTED)');
}

function daysAgo(n, hours = 0) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000 - hours * 60 * 60 * 1000);
}

async function backdate(incidentId, { occurred_at, updated_at, closed_at }) {
  const set = {};
  if (occurred_at) set.occurred_at = occurred_at;
  if (updated_at) set.updated_at = updated_at;
  if (closed_at) set.closed_at = closed_at;
  await Incident.updateOne({ _id: incidentId }, { $set: set });
}

async function backdateAssignment(assignmentId, { proposed_at, approved_at, arrived_at, completed_at }) {
  const set = {};
  if (proposed_at) set.proposed_at = proposed_at;
  if (approved_at) set.approved_at = approved_at;
  if (arrived_at) set.arrived_at = arrived_at;
  if (completed_at) set.completed_at = completed_at;
  await Assignment.updateOne({ _id: assignmentId }, { $set: set });
}

const SYSTEM_ACTOR = { kind: 'USER', id: 'user_seed_admin' };

/** Runs an incident from DISPATCHED through to a terminal state, with a real Assignment attached
 * and realistic backdated timestamps, so analytics/response-times has genuine spread. */
async function runIncidentToCompletion(incident, unit, { daysBack, terminal }) {
  const assignment = await manualAssign(incident._id, unit._id, { userId: 'user_seed_admin' });
  const occurredAt = daysAgo(daysBack, 0.15); // ~9 min before dispatch — realistic triage delay
  const proposedAt = daysAgo(daysBack, 0);
  const approvedAt = new Date(proposedAt.getTime() + 90 * 1000);
  const arrivedAt = new Date(approvedAt.getTime() + (6 + Math.random() * 9) * 60 * 1000);

  await updateAssignmentStatus(assignment._id, 'EN_ROUTE', { userId: 'user_seed_admin' });
  await updateAssignmentStatus(assignment._id, 'ON_SCENE', { userId: 'user_seed_admin' });
  await backdateAssignment(assignment._id, { proposed_at: proposedAt, approved_at: approvedAt, arrived_at: arrivedAt });

  let doc = await Incident.findById(incident._id);
  if (terminal === 'RESOLVED' || terminal === 'CLOSED') {
    ({ doc } = await patchIncidentStatus(incident._id, { status: 'RESOLVED', version: doc.version, actor: SYSTEM_ACTOR }));
    if (terminal === 'CLOSED') {
      ({ doc } = await patchIncidentStatus(incident._id, { status: 'CLOSED', version: doc.version, actor: SYSTEM_ACTOR }));
    }
    const completedAt = new Date(arrivedAt.getTime() + (25 + Math.random() * 40) * 60 * 1000);
    await updateAssignmentStatus(assignment._id, 'COMPLETED', { userId: 'user_seed_admin' });
    await backdateAssignment(assignment._id, { completed_at: completedAt });
    await backdate(incident._id, {
      occurred_at: occurredAt,
      updated_at: completedAt,
      closed_at: terminal === 'CLOSED' ? completedAt : null,
    });
  } else {
    await backdate(incident._id, { occurred_at: occurredAt, updated_at: arrivedAt });
  }

  return assignment;
}

async function seedRichDemoData(units, hospitals) {
  const existing = await Incident.countDocuments({});
  if (existing > 3) {
    logger.info('Rich demo data already present — skipping');
    return;
  }

  const availableUnits = () => Unit.find({ status: 'AVAILABLE' });

  // ─── Incident 4: FIRE_VEHICLE — resolved & closed 2 days ago ───
  const vehicleFire = await createIncident({
    type: 'FIRE_VEHICLE', title: 'Vehicle fire — Maninagar underpass',
    description: 'Car caught fire under Maninagar underpass, traffic disrupted.',
    location: { lng: 72.6110, lat: 22.9955 }, address: 'Maninagar Underpass', ward: 'Maninagar',
    occurred_at: daysAgo(2, 2).toISOString(), is_simulated: true,
  });
  await appendEvidenceBatch(vehicleFire._id, [
    { source_type: 'CCTV_ANALYTICS', source_label: 'CCTV MN-14', attribute: 'fire_active', claimed_value: true, asserted_probability: 0.85, extraction_confidence: 0.9, observed_at: daysAgo(2, 2).toISOString(), is_simulated: true },
  ]);
  await deriveAndPersistRequirements(vehicleFire._id);
  {
    const [unit] = await availableUnits();
    await runIncidentToCompletion(vehicleFire, unit, { daysBack: 2, terminal: 'CLOSED' });
  }

  // ─── Incident 5: FLOOD — CRITICAL, active dispatch plan + EN_ROUTE unit ───
  const flood = await createIncident({
    type: 'FLOOD', title: 'Flash flood — Sabarmati Riverfront',
    description: 'Rapid water rise along the riverfront, road access blocked, water rescue needed.',
    location: { lng: 72.5797, lat: 23.0225 }, address: 'Sabarmati Riverfront', ward: 'Riverfront',
    occurred_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(), is_simulated: true,
  });
  await appendEvidenceBatch(flood._id, [
    { source_type: 'GOV_DEPARTMENT', source_label: 'Irrigation Dept advisory', attribute: 'water_depth_high', claimed_value: true, asserted_probability: 0.92, extraction_confidence: 0.9, observed_at: new Date().toISOString(), is_simulated: true },
    { source_type: 'FIELD_UNIT', source_label: 'Field unit WR-01', attribute: 'road_blocked', claimed_value: true, asserted_probability: 0.88, extraction_confidence: 0.9, observed_at: new Date().toISOString(), is_simulated: true },
    { source_type: 'CITIZEN_APP', source_label: 'Citizen app +91••••7765', attribute: 'access_restricted', claimed_value: true, asserted_probability: 0.75, extraction_confidence: 0.75, observed_at: new Date().toISOString(), is_simulated: true },
  ]);
  await deriveAndPersistRequirements(flood._id);
  try {
    const plans = await generatePlans(flood._id);
    const feasible = plans.find((p) => p.feasible) || plans[0];
    if (feasible) {
      const { assignments } = await approvePlan(feasible._id, { userId: 'user_seed_admin' });
      if (assignments[0]) await updateAssignmentStatus(assignments[0]._id, 'EN_ROUTE', { userId: 'user_seed_admin' });
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Flood dispatch plan seed step skipped');
  }

  // ─── Incident 6: MEDICAL_EMERGENCY — ON_SCENE right now ───
  const medical = await createIncident({
    type: 'MEDICAL_EMERGENCY', title: 'Cardiac emergency — Bopal residence',
    description: 'Elderly patient, chest pain, ambulance requested urgently.',
    location: { lng: 72.4710, lat: 23.0340 }, address: 'Bopal Society Road', ward: 'Bopal',
    occurred_at: new Date(Date.now() - 22 * 60 * 1000).toISOString(), is_simulated: true,
  });
  await appendEvidenceBatch(medical._id, [
    { source_type: 'EMERGENCY_CALL', source_label: 'Emergency call +91••••3390', attribute: 'casualties_reported', claimed_value: true, asserted_probability: 0.8, extraction_confidence: 0.85, observed_at: new Date().toISOString(), is_simulated: true },
  ]);
  await deriveAndPersistRequirements(medical._id);
  {
    const [unit] = await Unit.find({ status: 'AVAILABLE', type: { $in: ['AMBULANCE_ALS', 'AMBULANCE_BLS'] } });
    if (unit) {
      const assignment = await manualAssign(medical._id, unit._id, { userId: 'user_seed_admin' });
      await updateAssignmentStatus(assignment._id, 'ON_SCENE', { userId: 'user_seed_admin' });
    }
  }

  // ─── Incident 7: GAS_LEAK — TRIAGED, awaiting dispatch ───
  const gasLeak = await createIncident({
    type: 'GAS_LEAK', title: 'Gas leak reported — Chandkheda residential block',
    description: 'Strong LPG smell reported in residential society, evacuation underway.',
    location: { lng: 72.5910, lat: 23.1010 }, address: 'Chandkheda Society', ward: 'Chandkheda',
    occurred_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(), is_simulated: true,
  });
  await appendEvidenceBatch(gasLeak._id, [
    { source_type: 'CITIZEN_SMS', source_label: 'Citizen SMS +91••••5541', attribute: 'gas_leak', claimed_value: true, asserted_probability: 0.7, extraction_confidence: 0.72, observed_at: new Date().toISOString(), is_simulated: true },
  ]);
  await deriveAndPersistRequirements(gasLeak._id);
  await patchIncidentStatus(gasLeak._id, { status: 'TRIAGED', version: 1, actor: SYSTEM_ACTOR });

  // ─── Incident 8: BUILDING_COLLAPSE — CRITICAL, still REPORTED (needs_attention demo) ───
  const collapse = await createIncident({
    type: 'BUILDING_COLLAPSE', title: 'Partial building collapse — Old city ward',
    description: 'Old structure partially collapsed after heavy rain, people feared trapped.',
    location: { lng: 72.5900, lat: 23.0250 }, address: 'Old City, Kalupur', ward: 'Kalupur',
    occurred_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), is_simulated: true,
  });
  await appendEvidenceBatch(collapse._id, [
    { source_type: 'EMERGENCY_CALL', source_label: 'Emergency call +91••••9012', attribute: 'people_trapped', claimed_value: true, asserted_probability: 0.88, extraction_confidence: 0.85, observed_at: new Date().toISOString(), is_simulated: true },
    { source_type: 'EMERGENCY_CALL', source_label: 'Emergency call +91••••9012', attribute: 'structural_damage', claimed_value: true, asserted_probability: 0.9, extraction_confidence: 0.88, observed_at: new Date().toISOString(), is_simulated: true },
  ]);
  await deriveAndPersistRequirements(collapse._id);

  // ─── Incident 9: ROAD_ACCIDENT duplicate of incident #3 — merge demo ───
  const existingAccident = await Incident.findOne({ title: /Multi-vehicle collision/ });
  const duplicateAccident = await createIncident({
    type: 'ROAD_ACCIDENT', title: 'Collision reported — SG Highway (duplicate report)',
    description: 'Second report of the same SG Highway collision from a different citizen.',
    location: { lng: 72.5105, lat: 23.0505 }, address: 'SG Highway', ward: 'Bodakdev',
    occurred_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(), is_simulated: true,
  });
  await appendEvidenceBatch(duplicateAccident._id, [
    { source_type: 'SOCIAL_MEDIA', source_label: 'Social media post', attribute: 'casualties_reported', claimed_value: true, asserted_probability: 0.5, extraction_confidence: 0.6, observed_at: new Date().toISOString(), is_simulated: true },
  ]);
  if (existingAccident) {
    await mergeIncidents(existingAccident._id, [duplicateAccident._id], { reason: 'Same collision, duplicate citizen report', userId: 'user_seed_admin' });
  }

  // ─── Incident 10: CROWD_INCIDENT — reported then marked FALSE_ALARM ───
  const crowd = await createIncident({
    type: 'CROWD_INCIDENT', title: 'Crowd gathering reported — Maninagar market',
    description: 'Reported large crowd gathering causing congestion.',
    location: { lng: 72.6080, lat: 22.9960 }, address: 'Maninagar Market', ward: 'Maninagar',
    occurred_at: daysAgo(0, 3).toISOString(), is_simulated: true,
  });
  await deriveAndPersistRequirements(crowd._id);
  await patchIncidentStatus(crowd._id, { status: 'FALSE_ALARM', version: 1, actor: SYSTEM_ACTOR });

  // ─── Incident 11: ELECTRICAL_HAZARD — resolved & closed 4 days ago ───
  const electrical = await createIncident({
    type: 'ELECTRICAL_HAZARD', title: 'Downed power line — Navrangpura crossing',
    description: 'Live wire down after storm, road cordoned off.',
    location: { lng: 72.5590, lat: 23.0340 }, address: 'Navrangpura Crossing', ward: 'Navrangpura',
    occurred_at: daysAgo(4, 3).toISOString(), is_simulated: true,
  });
  await appendEvidenceBatch(electrical._id, [
    { source_type: 'FIELD_UNIT', source_label: 'Field unit PP-01', attribute: 'power_down', claimed_value: true, asserted_probability: 0.9, extraction_confidence: 0.9, observed_at: daysAgo(4, 3).toISOString(), is_simulated: true },
  ]);
  await deriveAndPersistRequirements(electrical._id);
  {
    const [unit] = await Unit.find({ status: 'AVAILABLE', type: 'UTILITY_CREW' });
    const fallback = unit || (await availableUnits())[0];
    if (fallback) await runIncidentToCompletion(electrical, fallback, { daysBack: 4, terminal: 'CLOSED' });
  }

  // ─── Incident 12: WATERLOGGING — resolved (not closed) 1 day ago ───
  const waterlogging = await createIncident({
    type: 'WATERLOGGING', title: 'Waterlogging — Naroda GIDC access road',
    description: 'Heavy waterlogging after rain, minor vehicle disruption.',
    location: { lng: 72.6500, lat: 23.0700 }, address: 'Naroda GIDC', ward: 'Naroda',
    occurred_at: daysAgo(1, 5).toISOString(), is_simulated: true,
  });
  await deriveAndPersistRequirements(waterlogging._id);
  {
    const [unit] = await availableUnits();
    if (unit) await runIncidentToCompletion(waterlogging, unit, { daysBack: 1, terminal: 'RESOLVED' });
  }

  logger.info('Seeded 9 additional incidents (14 total): dispatch/resolved/closed/merged/false-alarm variety');

  // ─── IncidentLink: an unconfirmed suggestion for the analytics "recommendations" feed ───
  await createLink({
    from_incident_id: gasLeak._id, to_incident_id: collapse._id, relation: 'RELATED_TO',
    score: 0.42, explanation: 'Geographically close, reported within minutes of each other', confirmed: false,
  });

  // ─── Alerts: manually raise the types with no organic trigger path ───
  await raiseAlert({
    type: 'COVERAGE_HOLE', severity: 'HIGH', title: 'Coverage hole detected — Bopal sector',
    body: 'Projected response time exceeds SLA for 3 consecutive grid cells.',
  });
  await raiseAlert({
    type: 'SLA_BREACH', severity: 'HIGH', incident_id: gasLeak._id,
    title: `${gasLeak.code} approaching SLA breach — no unit dispatched in 8 minutes`,
    body: 'HIGH severity gas leak still awaiting dispatch.',
  });
  await raiseAlert({
    type: 'CASCADE_RISK', severity: 'MODERATE', incident_id: flood._id,
    title: `${flood.code} — cascading road closure risk`,
    body: 'Rising water levels may cascade to 2 adjacent road segments within 30 minutes.',
  });
  const unresponsiveAlert = await raiseAlert({
    type: 'UNIT_UNRESPONSIVE', severity: 'MODERATE', unit_id: units[units.length - 1]._id,
    title: `Unit ${units[units.length - 1].call_sign} has not reported location in 15 minutes`,
    body: 'Last known location may be stale.',
  });
  await ackAlert(unresponsiveAlert._id, 'user_seed_admin');
  const aiDegradedAlert = await raiseAlert({
    type: 'AI_DEGRADED', severity: 'LOW', title: 'AI classification running in degraded mode',
    body: 'Falling back to keyword rules for incident type classification.',
  });
  await ackAlert(aiDegradedAlert._id, 'user_seed_admin');
  await raiseAlert({
    type: 'RESOURCE_SHORTAGE', severity: 'HIGH', title: 'Fire suppression capability running low',
    body: 'Only 1 of 4 fire engines remain available city-wide.',
  });
  const dupAlert = await raiseAlert({
    type: 'DUPLICATE_SUSPECTED', severity: 'LOW', incident_id: duplicateAccident._id,
    title: `${duplicateAccident.code} suspected duplicate of ${existingAccident?.code || 'nearby incident'}`,
    body: 'Correlation score 0.81 — pending operator confirmation.',
  });
  await ackAlert(dupAlert._id, 'user_seed_admin');

  logger.info('Seeded alert variety across all 11 alert types');

  // ─── AiCall rows for /admin/ai/health (rolling 5-minute window) ───
  const endpoints = ['extract', 'classify', 'correlate', 'briefing', 'embed'];
  const aiCalls = [];
  for (let i = 0; i < 24; i++) {
    const ok = Math.random() > 0.08;
    const degraded = ok && Math.random() < 0.18;
    aiCalls.push({
      _id: newId('aicall'), endpoint: endpoints[i % endpoints.length],
      latency_ms: Math.round(180 + Math.random() * 1400), ok, degraded,
      schema_failed: !ok && Math.random() < 0.3,
      model: 'llama-3.3-70b-versatile',
      created_at: new Date(Date.now() - Math.random() * 4 * 60 * 1000),
    });
  }
  await AiCall.insertMany(aiCalls);

  // ─── Report rows for /admin/ai/eval (extraction fallback rate) ───
  const reportTexts = [
    'Fire reported near market area', 'Water logging on main road', 'Accident involving two vehicles',
    'Gas smell reported by residents', 'Medical emergency at bus stand', 'Crowd gathering at temple grounds',
    'Power line down after storm', 'Building crack reported by residents', 'Chemical smell near factory',
    'Vehicle fire on highway', 'Flood water entering homes', 'Electrical spark reported',
  ];
  const reports = reportTexts.map((text, i) => ({
    _id: newId('report'), source_type: SOURCE_TYPE_SAMPLE[i % SOURCE_TYPE_SAMPLE.length],
    source_label: 'Historical demo report', text,
    location: toGeoJson({ lng: 72.55 + Math.random() * 0.1, lat: 22.98 + Math.random() * 0.1 }),
    occurred_at: daysAgo(Math.floor(Math.random() * 5)),
    processing_status: 'PROCESSED', is_simulated: true,
    degraded_steps: i % 4 === 0 ? ['EXTRACT'] : [],
  }));
  await Report.insertMany(reports);

  logger.info('Seeded 24 AiCall rows + 12 processed Report rows for AI Health page');
}

const SOURCE_TYPE_SAMPLE = ['CITIZEN_APP', 'EMERGENCY_CALL', 'CITIZEN_SMS', 'SOCIAL_MEDIA', 'FIELD_UNIT'];

async function main() {
  await connectDb();
  if (RESET) await reset();

  await seedUsers();
  const stations = await seedStations();
  const units = await seedUnits(stations);
  const hospitals = await seedHospitals();
  await seedRoadSegments();
  await seedDemoIncidents();
  await seedRichDemoData(units, hospitals);

  logger.info('Seed complete.');
  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
