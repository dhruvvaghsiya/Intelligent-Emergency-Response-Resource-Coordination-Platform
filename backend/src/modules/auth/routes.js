import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../../models/User.js';
import { env } from '../../config/env.js';
import { AppError } from '../../platform/errors.js';
import { validateBody } from '../../middleware/validate.js';
import { LoginSchema, RefreshSchema } from '../../contracts/schemas.js';
import { authenticate } from '../../middleware/auth.js';
import { loginLimiter } from '../../platform/rateLimit.js';
import { can, PERMISSIONS } from '../../platform/rbac.js';

export const authRouter = Router();

function signAccessToken(user) {
  return jwt.sign({ sub: user._id, role: user.role, name: user.name, station_id: user.station_id },
    env.JWT_SECRET, { expiresIn: env.JWT_ACCESS_TTL });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user._id, type: 'refresh' }, env.JWT_SECRET, { expiresIn: env.JWT_REFRESH_TTL });
}

function toWireUser(user) {
  return { id: user._id, email: user.email, name: user.name, role: user.role, station_id: user.station_id };
}

authRouter.post('/login', loginLimiter, validateBody(LoginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new AppError('UNAUTHENTICATED', 'Invalid credentials');
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new AppError('UNAUTHENTICATED', 'Invalid credentials');

    res.json({
      data: {
        access_token: signAccessToken(user),
        refresh_token: signRefreshToken(user),
        user: toWireUser(user),
      },
    });
  } catch (err) { next(err); }
});

authRouter.post('/refresh', validateBody(RefreshSchema), async (req, res, next) => {
  try {
    let payload;
    try {
      payload = jwt.verify(req.body.refresh_token, env.JWT_SECRET);
    } catch {
      throw new AppError('UNAUTHENTICATED', 'Invalid or expired refresh token');
    }
    if (payload.type !== 'refresh') throw new AppError('UNAUTHENTICATED', 'Not a refresh token');
    const user = await User.findById(payload.sub);
    if (!user) throw new AppError('UNAUTHENTICATED', 'User no longer exists');

    res.json({
      data: {
        access_token: signAccessToken(user),
        refresh_token: signRefreshToken(user),
        user: toWireUser(user),
      },
    });
  } catch (err) { next(err); }
});

authRouter.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role = 'DISPATCHER', station_id = null } = req.body;
    if (!name || !email || !password) {
      throw new AppError('BAD_REQUEST', 'Name, email, and password are required');
    }
    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      throw new AppError('CONFLICT', 'An operator account with this email already exists');
    }
    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      _id: `user_${Date.now()}`,
      name: name.trim(),
      email: cleanEmail,
      role: role.toUpperCase(),
      station_id: station_id || null,
      password_hash,
    });
    res.status(201).json({
      data: {
        access_token: signAccessToken(user),
        refresh_token: signRefreshToken(user),
        user: toWireUser(user),
      },
    });
  } catch (err) { next(err); }
});

authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) throw new AppError('NOT_FOUND', 'User not found');
    const permissions = Object.values(PERMISSIONS).filter((p) => can(user.role, p));
    res.json({ data: { ...toWireUser(user), permissions } });
  } catch (err) { next(err); }
});
