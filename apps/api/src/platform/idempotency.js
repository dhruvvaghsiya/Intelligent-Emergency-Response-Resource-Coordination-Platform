// §F12 — Idempotency-Key required on all POSTs that create/act; server stores (key, route,
// response) for 24h and replays the stored response on retry.

import crypto from 'crypto';
import { IdempotencyKey } from '../models/IdempotencyKey.js';
import { AppError } from './errors.js';

function hashRequest(req) {
  return crypto.createHash('sha256').update(JSON.stringify(req.body || {})).digest('hex');
}

export function idempotent(routeName, { required = true } = {}) {
  return async (req, res, next) => {
    const key = req.headers['idempotency-key'];
    if (!key) {
      if (required) return next(new AppError('VALIDATION_ERROR', 'Idempotency-Key header is required', {
        fields: [{ path: 'headers.idempotency-key', message: 'required' }],
      }));
      return next();
    }

    const scopedKey = `${routeName}:${key}`;
    const requestHash = hashRequest(req);
    const existing = await IdempotencyKey.findById(scopedKey);
    if (existing) {
      if (existing.request_hash !== requestHash) {
        return next(new AppError('UNPROCESSABLE', 'Idempotency-Key reused with a different request body'));
      }
      return res.status(existing.status_code).json(existing.response);
    }

    // capture the response so we can store it once the handler finishes
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      IdempotencyKey.create({
        _id: scopedKey, route: routeName, user_id: req.user?.id || null,
        request_hash: requestHash, response: body, status_code: res.statusCode,
      }).catch(() => {});
      return originalJson(body);
    };
    next();
  };
}
