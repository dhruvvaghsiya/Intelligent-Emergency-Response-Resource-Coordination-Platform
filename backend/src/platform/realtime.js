import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let io = null;
let lastHeartbeat = Date.now();

export function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGINS, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('UNAUTHENTICATED'));
      const payload = jwt.verify(token, env.JWT_SECRET);
      socket.user = { id: payload.sub, role: payload.role, name: payload.name };
      next();
    } catch {
      next(new Error('UNAUTHENTICATED'));
    }
  });

  io.on('connection', (socket) => {
    socket.join('ops:global');
    socket.join(`user:${socket.user.id}`);
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
