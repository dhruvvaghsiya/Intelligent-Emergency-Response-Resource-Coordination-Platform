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

import { createIncident } from '../modules/incidents/service.js';
import { appendEvidenceBatch } from '../modules/evidence/service.js';
import { deriveAndPersistRequirements } from '../modules/dispatch/service.js';

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
  const users = [
    { email: 'commander@prahari.in', name: 'Cdr. Shah', role: 'COMMANDER' },
    { email: 'dispatch@prahari.in', name: 'Dispatcher Patel', role: 'DISPATCHER' },
    { email: 'analyst@prahari.in', name: 'Analyst Mehta', role: 'ANALYST' },
    { email: 'unit07@prahari.in', name: 'Unit 07 Crew', role: 'FIELD_UNIT' },
    { email: 'admin@prahari.in', name: 'Admin', role: 'ADMIN' },
  ];
  const password_hash = await bcrypt.hash('prahari123', 10);
  for (const u of users) {
    await User.findOneAndUpdate({ email: u.email }, { $setOnInsert: { _id: newId('user'), ...u, password_hash } }, { upsert: true });
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

async function main() {
  await connectDb();
  if (RESET) await reset();

  await seedUsers();
  const stations = await seedStations();
  await seedUnits(stations);
  await seedHospitals();
  await seedRoadSegments();
  await seedDemoIncidents();

  logger.info('Seed complete.');
  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
