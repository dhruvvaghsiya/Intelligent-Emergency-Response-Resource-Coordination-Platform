import { env } from '../config/env.js';

export function isOriginAllowed(origin) {
  if (!origin) return true;
  if (env.CORS_ORIGINS.includes('*') || env.CORS_ORIGINS.includes(origin)) return true;
  // Allow all Vercel domains (production & preview deployments)
  if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return true;
  // Allow local development on any port
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
  return false;
}
