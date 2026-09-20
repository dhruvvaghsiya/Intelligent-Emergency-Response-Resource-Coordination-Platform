import { Router } from 'express';
import { Unit } from '../../models/Unit.js';
import { UnitLocationHistory } from '../../models/UnitLocationHistory.js';
import { Hospital } from '../../models/Hospital.js';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.js';
import { requirePermission, PERMISSIONS } from '../../platform/rbac.js';
import { validateBody } from '../../middleware/validate.js';
import { UnitPatchSchema, UnitLocationSchema } from '../../contracts/schemas.js';
import { toGeoJson, toWirePoint, bboxToGeoWithin } from '../../utils/geo.js';
import { newId } from '../../utils/ids.js';
import { appendEvent } from '../../platform/events.js';
import { AppError } from '../../platform/errors.js';

export const resourcesRouter = Router();

function toUnitWire(u) {
  return {
    id: u._id, call_sign: u.call_sign, type: u.type, capabilities: u.capabilities, status: u.status,
    station_id: u.station_id, location: toWirePoint(u.location), heading: u.heading,
    last_location_at: u.last_location_at.toISOString(), crew_size: u.crew_size,
    current_assignment_id: u.current_assignment_id, version: u.version, is_simulated: u.is_simulated,
  };
}

resourcesRouter.get('/units', optionalAuthenticate, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = { $in: String(req.query.status).split(',') };
    if (req.query.type) filter.type = { $in: String(req.query.type).split(',') };
    if (req.query.capability) filter.capabilities = { $in: String(req.query.capability).split(',') };
    if (req.query.bbox) filter.location = bboxToGeoWithin(String(req.query.bbox).split(',').map(Number));
    const units = await Unit.find(filter);
    res.json({ data: units.map(toUnitWire) });
  } catch (err) { next(err); }
});

resourcesRouter.patch('/units/:id', authenticate, requirePermission(PERMISSIONS.UPDATE_OWN_UNIT), validateBody(UnitPatchSchema), async (req, res, next) => {
  try {
    const unit = await Unit.findById(req.params.id);
    if (!unit) throw new AppError('NOT_FOUND', 'Unit not found');
    if (unit.version !== req.body.version) throw new AppError('VERSION_CONFLICT', 'Unit has changed', { current: toUnitWire(unit) });

    unit.status = req.body.status;
    unit.version += 1;
    await unit.save();

    await appendEvent({ room: 'ops:global', type: 'unit.status_changed', entity: { kind: 'unit', id: unit._id }, actor: { kind: 'USER', id: req.user.id }, payload: toUnitWire(unit) });
    res.json({ data: toUnitWire(unit) });
  } catch (err) { next(err); }
});

resourcesRouter.post('/units/:id/location', authenticate, validateBody(UnitLocationSchema), async (req, res, next) => {
  try {
    const unit = await Unit.findById(req.params.id);
    if (!unit) throw new AppError('NOT_FOUND', 'Unit not found');

    const recordedAt = req.body.recorded_at ? new Date(req.body.recorded_at) : new Date();
    unit.location = toGeoJson({ lng: req.body.lng, lat: req.body.lat });
    unit.heading = req.body.heading ?? unit.heading;
    unit.speed_mps = req.body.speed_mps ?? unit.speed_mps;
    unit.last_location_at = recordedAt;
    await unit.save();

    await UnitLocationHistory.create({ _id: newId('location'), unit_id: unit._id, location: unit.location, recorded_at: recordedAt });

    // §18.1 throttled push — coalesced client-side is out of scope here; server just emits.
    await appendEvent({ room: `unit:${unit._id}`, type: 'unit.location', entity: { kind: 'unit', id: unit._id }, actor: { kind: 'SYSTEM' }, payload: toUnitWire(unit) });
    res.status(202).json({ data: { accepted: true } });
  } catch (err) { next(err); }
});

resourcesRouter.get('/hospitals', optionalAuthenticate, async (req, res, next) => {
  try {
    const hospitals = await Hospital.find();
    res.json({ data: hospitals.map(toHospitalWire) });
  } catch (err) { next(err); }
});

resourcesRouter.patch('/hospitals/:id/capacity', authenticate, requirePermission(PERMISSIONS.MANAGE_RESOURCES), async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) throw new AppError('NOT_FOUND', 'Hospital not found');
    if (req.body.beds_available != null) hospital.beds_available = req.body.beds_available;
    if (req.body.icu_available != null) hospital.icu_available = req.body.icu_available;
    hospital.updated_at = new Date();
    await hospital.save();
    res.json({ data: toHospitalWire(hospital) });
  } catch (err) { next(err); }
});

function toHospitalWire(h) {
  return {
    id: h._id, name: h.name, location: toWirePoint(h.location), beds_total: h.beds_total,
    beds_available: h.beds_available, icu_available: h.icu_available, specialities: h.specialities,
    updated_at: h.updated_at.toISOString(), is_simulated: h.is_simulated,
  };
}

export { toUnitWire };
