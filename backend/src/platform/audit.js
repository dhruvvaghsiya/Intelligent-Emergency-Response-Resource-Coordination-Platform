import { AuditLog } from '../models/AuditLog.js';
import { newId } from '../utils/ids.js';

export async function audit({ req, action, entityKind, entityId, before = null, after = null, reason = null }) {
  await AuditLog.create({
    _id: newId('audit'),
    user_id: req?.user?.id || null,
    action,
    entity_kind: entityKind,
    entity_id: entityId,
    before,
    after,
    reason,
    ip: req?.ip || null,
    request_id: req?.requestId || null,
  });
}
