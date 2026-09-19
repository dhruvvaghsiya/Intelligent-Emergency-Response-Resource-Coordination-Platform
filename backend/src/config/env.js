import 'dotenv/config';

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/prahari',
  PORT: num(process.env.PORT, 4000),
  JWT_SECRET: process.env.JWT_SECRET || 'dev-only-change-me',
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL || '30m',
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL || '7d',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  AI_TIMEOUT_MS: num(process.env.AI_TIMEOUT_MS, 2000),
  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map((s) => s.trim()),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  SIM_ENABLED: (process.env.SIM_ENABLED || 'true') === 'true',
  NODE_ENV: process.env.NODE_ENV || 'development',
};
