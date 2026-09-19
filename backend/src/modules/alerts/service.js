import { Alert } from '../../models/Alert.js';
import { newId } from '../../utils/ids.js';
import { appendEvent } from '../../platform/events.js';

export function toAlertWire(a) {
  return {
    id: a._id, type: a.type, severity: a.severity, incident_id: a.incident_id, unit_id: a.unit_id,
    title: a.title, body: a.body, payload: a.payload, raised_at: a.raised_at.toISOString(),
    acked_by: a.acked_by, acked_at: a.acked_at?.toISOString?.() ?? null,
  };
}

/** §24 alert raising is A3 (Act-and-notify) — raised automatically, human is told. Dedupe by key. */
export async function raiseAlert({ type, severity = 'INFO', incident_id = null, unit_id = null, title, body = '', payload = {}, dedupe_key = null }) {
  if (dedupe_key) {
    const existingUnacked = await Alert.findOne({ dedupe_key, acked_at: null });
    if (existingUnacked) return existingUnacked; // do not spam duplicates of an unacknowledged alert
  }

  const doc = await Alert.create({
    _id: newId('alert'), type, severity, incident_id, unit_id, title, body, payload, dedupe_key,
  });

  await appendEvent({
    room: 'ops:global', type: 'alert.raised', entity: { kind: 'alert', id: doc._id },
    actor: { kind: 'SYSTEM' }, payload: toAlertWire(doc),
  });
  if (incident_id) {
    await appendEvent({
      room: `incident:${incident_id}`, type: 'alert.raised', entity: { kind: 'alert', id: doc._id },
      actor: { kind: 'SYSTEM' }, payload: toAlertWire(doc),
    });
  }

  return doc;
}

export async function ackAlert(alertId, userId) {
  const doc = await Alert.findById(alertId);
  if (!doc) return null;
  if (doc.acked_at) return doc;
  doc.acked_by = userId;
  doc.acked_at = new Date();
  await doc.save();

  await appendEvent({
    room: 'ops:global', type: 'alert.acked', entity: { kind: 'alert', id: doc._id },
    actor: { kind: 'USER', id: userId }, payload: toAlertWire(doc),
  });
  return doc;
}
