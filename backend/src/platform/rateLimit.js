import rateLimit from 'express-rate-limit';
import { TUNING } from '../contracts/tuning.js';
import { AppError } from './errors.js';

function handler(req, res, next, options) {
  next(new AppError('RATE_LIMITED', 'Too many requests', { retry_after_s: Math.ceil(options.windowMs / 1000) }));
}

export const reportsIpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: TUNING.rateLimit.reportsPerMinutePerIp,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: TUNING.rateLimit.loginPerMinute,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});
