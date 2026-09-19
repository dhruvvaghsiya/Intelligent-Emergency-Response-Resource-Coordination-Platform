// §27 field offline queue — POST /field/sync. Minimal honest implementation: dedupes by
// idempotency_key, applies unit-status updates via the monotonic status rule (a unit can never
// move backwards from ON_SCENE to EN_ROUTE via a stale queued event), and appends evidence
// observations (safe by construction — evidence is append-only, §27).

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission, PERMISSIONS } from '../../platform/rbac.js';
import { Assignment } from '../../models/Assignment.js';
import { IdempotencyKey } from '../../models/IdempotencyKey.js';
import { appendEvidence } from '../evidence/service.js';
import { updateAssignmentStatus } from '../dispatch/service.js';

export const notifyRouter = Router();

const STATUS_RANK = { PROPOSED: 0, APPROVED: 1, EN_ROUTE: 2, ON_SCENE: 3, COMPLETED: 4, REJECTED: 4, CANCELLED: 4, PREEMPTED: 4 };

notifyRouter.post('/field/sync', authenticate, requirePermission(PERMISSIONS.UPDATE_OWN_UNIT), async (req, res, next) => {
  try {
    const actions = Array.isArray(req.body?.actions) ? req.body.actions : [];
    const results = [];

    for (const action of actions) {
      const key = `field_sync:${action.idempotency_key}`;
      const existing = await IdempotencyKey.findById(key);
      if (existing) {
        results.push({ idempotency_key: action.idempotency_key, applied: 'superseded', reason: 'already processed' });
        continue;
      }

      try {
        if (action.type === 'STATUS_UPDATE') {
          const assignment = await Assignment.findById(action.payload.assignment_id);
          if (!assignment) throw new Error('assignment not found');
          if (STATUS_RANK[action.payload.status] < STATUS_RANK[assignment.status]) {
            results.push({ idempotency_key: action.idempotency_key, applied: 'rejected', reason: 'monotonic status rule' });
          } else {
            await updateAssignmentStatus(action.payload.assignment_id, action.payload.status, { userId: req.user.id });
            results.push({ idempotency_key: action.idempotency_key, applied: 'applied' });
          }
        } else if (action.type === 'OBSERVATION') {
          await appendEvidence(action.payload.incident_id, {
            source_type: 'FIELD_UNIT', source_label: `Field unit ${req.user.name}`,
            attribute: action.payload.attribute, claimed_value: true,
            asserted_probability: action.payload.asserted_probability ?? 0.8,
            extraction_confidence: 0.9, observed_at: action.captured_at,
          }, { kind: 'USER', id: req.user.id, name: req.user.name });
          results.push({ idempotency_key: action.idempotency_key, applied: 'applied' });
        } else {
          results.push({ idempotency_key: action.idempotency_key, applied: 'rejected', reason: 'unknown action type' });
        }
      } catch (err) {
        results.push({ idempotency_key: action.idempotency_key, applied: 'rejected', reason: err.message });
      }

      await IdempotencyKey.create({ _id: key, route: 'field_sync', user_id: req.user.id, request_hash: action.idempotency_key, response: { ok: true }, status_code: 200 });
    }

    res.json({ data: results });
  } catch (err) { next(err); }
});
