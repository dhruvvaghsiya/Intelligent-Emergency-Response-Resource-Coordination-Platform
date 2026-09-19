import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../platform/errors.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new AppError('UNAUTHENTICATED', 'Missing bearer token'));
  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role, name: payload.name, station_id: payload.station_id };
    next();
  } catch {
    next(new AppError('UNAUTHENTICATED', 'Invalid or expired token'));
  }
}

/** For PUBLIC routes that still want req.user if a valid token happens to be present. */
export function optionalAuthenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  try {
    const payload = jwt.verify(header.slice('Bearer '.length), env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role, name: payload.name, station_id: payload.station_id };
  } catch {
    // ignore — treated as anonymous
  }
  next();
}
