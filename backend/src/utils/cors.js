import { env } from '../config/env.js';

export function isOriginAllowed(origin) {
  if (!origin) return true;
  if (env.CORS_ORIGINS.includes('*') || env.CORS_ORIGINS.includes(origin)) return true;
  // Allow all Vercel domains (production & preview deployments)
  if (/^https?:\/\/.*\.vercel\.app$/i.test(origin)) return true;
  // Allow Render domains
  if (/^https?:\/\/.*\.onrender\.com$/i.test(origin)) return true;
  // Allow local development on any port
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  // Prefix matching for configured origins
  if (env.CORS_ORIGINS.some((allowed) => allowed && origin.startsWith(allowed.replace(/\/$/, '')))) return true;
  // Hackathon/public API fallback: allow web clients to connect
  return true;
}
