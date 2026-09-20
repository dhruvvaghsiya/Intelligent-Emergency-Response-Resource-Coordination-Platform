import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import { isOriginAllowed } from '../utils/cors.js';

let io = null;
let lastHeartbeat = Date.now();

export function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Socket CORS blocked for origin: ${origin}`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  // §public-viewing — anonymous visitors get a live read-only connection (they still only ever
  // receive broadcasts to 'ops:global'/'sim', never a private `user:<id>` room). A present-but-bad
  // token is also just treated as anonymous rather than rejecting the socket outright — mutating
  // actions are what actually require a valid session, enforced by the REST API's own auth.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      socket.user = null;
      return next();
    }
    try {
      const payload = jwt.verify(token, env.JWT_SECRET);
      socket.user = { id: payload.sub, role: payload.role, name: payload.name };
    } catch {
      socket.user = null;
    }
    next();
  });

  io.on('connection', (socket) => {
    socket.join('ops:global');
    if (socket.user) socket.join(`user:${socket.user.id}`);
    if (env.SIM_ENABLED) socket.join('sim');

    socket.on('room:join', (room) => {
      if (typeof room === 'string' && /^(incident|unit):[A-Za-z0-9_]+$/.test(room)) socket.join(room);
    });
    socket.on('room:leave', (room) => {
      if (typeof room === 'string') socket.leave(room);
    });
    socket.on('disconnect', () => {});
  });

  setInterval(() => {
    io.emit('heartbeat', { ts: new Date().toISOString() });
    lastHeartbeat = Date.now();
  }, 5000);

  logger.info('Socket.IO realtime layer initialised');
  return io;
}

export function getIo() {
  return io;
}
