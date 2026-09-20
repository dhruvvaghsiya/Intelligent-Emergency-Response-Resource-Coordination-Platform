/* =========================================================================
   SOCKET.IO CLIENT — realtime connection to the backend (§13.5)
   ========================================================================= */
import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(token) {
  if (socket) disconnectSocket();
  const socketUrl = import.meta.env?.VITE_SOCKET_URL ||
    (import.meta.env?.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '') : 'http://localhost:4000');
  socket = io(socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
