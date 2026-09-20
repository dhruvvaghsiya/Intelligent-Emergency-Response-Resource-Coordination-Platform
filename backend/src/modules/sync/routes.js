// §13.5 gap recovery — GET /sync?room=&since_seq=

import { Router } from 'express';
import { optionalAuthenticate } from '../../middleware/auth.js';
import { eventsSince } from '../../platform/events.js';

export const syncRouter = Router();

syncRouter.get('/sync', optionalAuthenticate, async (req, res, next) => {
  try {
    const room = String(req.query.room || 'ops:global');
    const sinceSeq = Number(req.query.since_seq) || 0;
    const events = await eventsSince(room, sinceSeq);
    res.json({
      data: events.map((e) => ({
        event_id: e._id, seq: e.seq, room: e.room, type: e.type, v: e.v,
        ts: e.ts.toISOString(), entity: e.entity, actor: e.actor, payload: e.payload,
      })),
    });
  } catch (err) { next(err); }
});
