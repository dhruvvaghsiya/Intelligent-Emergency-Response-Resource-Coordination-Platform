// §13.5 realtime contract + §18.2 delivery guarantees — event_log is the source of truth;
// outbox is drained to Socket.IO AFTER the domain write commits, never inside it.

import { EventLog } from '../models/EventLog.js';
import { Outbox } from '../models/Outbox.js';
import { nextCounter } from '../models/Counter.js';
import { newId } from '../utils/ids.js';
import { getIo } from './realtime.js';
import { logger } from './logger.js';

/**
 * Append a domain event to event_log + outbox. Payload MUST be self-sufficient (§13.5 payload
 * rule) — always the full updated summary object, never a patch.
 */
export async function appendEvent({ room, type, entity, actor = { kind: 'SYSTEM' }, payload }) {
  const seq = await nextCounter(`seq:${room}`);
  const eventId = newId('event');
  const doc = await EventLog.create({
    _id: eventId, seq, room, type, v: 1, ts: new Date(), entity, actor, payload,
  });
  await Outbox.create({ _id: newId('outbox'), event_id: eventId, delivered: false });
  // fire-and-forget drain for low latency; the poller in server.js is the resilience backstop
  drainOutbox().catch((err) => logger.error({ err }, 'outbox drain failed'));
  return doc;
}

export async function drainOutbox(limit = 50) {
  const io = getIo();
  if (!io) return;
  const pending = await Outbox.find({ delivered: false }).sort({ created_at: 1 }).limit(limit);
  if (pending.length === 0) return;

  const eventIds = pending.map((p) => p.event_id);
  const events = await EventLog.find({ _id: { $in: eventIds } });
  const byId = new Map(events.map((e) => [e._id, e]));

  for (const row of pending) {
    const evt = byId.get(row.event_id);
    if (!evt) {
      row.delivered = true;
      await row.save();
      continue;
    }
    io.to(evt.room).emit(evt.type, {
      event_id: evt._id, seq: evt.seq, room: evt.room, type: evt.type, v: evt.v,
      ts: evt.ts.toISOString(), entity: evt.entity, actor: evt.actor, payload: evt.payload,
    });
    row.delivered = true;
    await row.save();
  }
}

/** §13.5 gap recovery — GET /sync?room=&since_seq= */
export async function eventsSince(room, sinceSeq, limit = 500) {
  return EventLog.find({ room, seq: { $gt: sinceSeq } }).sort({ seq: 1 }).limit(limit);
}
