import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { env } from './config/env.js';
import { logger } from './platform/logger.js';
import { requestIdMiddleware } from './platform/requestId.js';
import { errorHandler } from './platform/errors.js';

import { authRouter } from './modules/auth/routes.js';
import { ingestRouter } from './modules/ingest/routes.js';
import { incidentsRouter } from './modules/incidents/routes.js';
import { evidenceRouter } from './modules/evidence/routes.js';
import { severityRouter } from './modules/severity/routes.js';
import { correlationRouter } from './modules/correlation/routes.js';
import { resourcesRouter } from './modules/resources/routes.js';
import { dispatchRouter } from './modules/dispatch/routes.js';
import { coverageRouter } from './modules/coverage/routes.js';
import { alertsRouter } from './modules/alerts/routes.js';
import { syncRouter } from './modules/sync/routes.js';
import { replayRouter } from './modules/replay/routes.js';
import { analyticsRouter } from './modules/analytics/routes.js';
import { notifyRouter } from './modules/notify/routes.js';
import { adminRouter, healthRouter } from './modules/admin/routes.js';
import { isOriginAllowed } from './utils/cors.js';

export function buildApp() {
  const app = express();

  const corsOptions = {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['X-Request-Id'],
    optionsSuccessStatus: 204,
  };

  app.use(helmet({ crossOriginResourcePolicy: false, crossOriginOpenerPolicy: false }));
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  app.use(express.json({ limit: '2mb' }));
  app.use(requestIdMiddleware);
  app.use(pinoHttp({ logger, customLogLevel: (req, res) => (res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'debug') }));

  const v1 = express.Router();
  v1.use('/auth', authRouter);
  v1.use(ingestRouter);
  v1.use(incidentsRouter);
  v1.use(evidenceRouter);
  v1.use(severityRouter);
  v1.use(correlationRouter);
  v1.use(resourcesRouter);
  v1.use(dispatchRouter);
  v1.use(coverageRouter);
  v1.use(alertsRouter);
  v1.use(syncRouter);
  v1.use(replayRouter);
  v1.use(analyticsRouter);
  v1.use(notifyRouter);
  v1.use(adminRouter);

  app.use('/api/v1', v1);
  app.use('/api/v1', healthRouter); // /health is also PUBLIC at /api/v1/health
  app.use(healthRouter); // and bare /health for container/orchestrator liveness probes

  app.get('/', (req, res) => {
    res.json({
      name: 'Resilio Emergency Response Platform API',
      status: 'operational',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        api_v1: '/api/v1'
      }
    });
  });

  app.use((req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found', request_id: req.requestId } });
  });

  app.use(errorHandler);
  return app;
}
