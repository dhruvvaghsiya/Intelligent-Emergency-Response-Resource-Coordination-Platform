// §29 GET /replay?from&to&limit&cursor — historical event stream for the scrubber.

import { Router } from 'express';
import { EventLog } from '../../models/EventLog.js';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, PERMISSIONS } from '../../platform/rbac.js';

export const replayRouter = Router();

replayRouter.get('/replay', authenticate, requirePermission(PERMISSIONS.ANALYTICS), async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.from) filter.ts = { ...(filter.ts || {}), $gte: new Date(req.query.from) };
    if (req.query.to) filter.ts = { ...(filter.ts || {}), $lte: new Date(req.query.to) };
    const limit = Math.min(Number(req.query.limit) || 500, 2000);
    let query = EventLog.find(filter).sort({ ts: 1 });
    if (req.query.cursor) query = query.where('_id').gt(req.query.cursor);
    const events = await query.limit(limit);

    res.json({
      data: events.map((e) => ({
        event_id: e._id, seq: e.seq, room: e.room, type: e.type, ts: e.ts.toISOString(),
        entity: e.entity, actor: e.actor, payload: e.payload,
      })),
      meta: { next_cursor: events.length === limit ? events[events.length - 1]._id : null, limit },
    });
  } catch (err) { next(err); }
});
