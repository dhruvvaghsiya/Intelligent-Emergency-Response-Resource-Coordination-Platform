import http from 'http';
import { env } from './config/env.js';
import { logger } from './platform/logger.js';
import { connectDb } from './platform/db.js';
import { buildApp } from './app.js';
import { initRealtime } from './platform/realtime.js';
import { drainOutbox } from './platform/events.js';
import { registerJobHandler, startJobWorker, enqueueJob } from './platform/jobs.js';
import { processReport } from './modules/pipeline/orchestrator.js';
import { sweepExpiredCascadeEffects } from './modules/cascade/service.js';

async function main() {
  await connectDb();

  registerJobHandler('PROCESS_REPORT', async (payload) => {
    await processReport(payload.report_id);
  });
  registerJobHandler('APPLY_CASCADE_TTL_SWEEP', async () => {
    await sweepExpiredCascadeEffects();
  });

  const app = buildApp();
  const httpServer = http.createServer(app);
  initRealtime(httpServer);

  startJobWorker();

  // resiliency backstop: appendEvent() already fire-and-forget drains, this catches anything
  // left over after a crash/restart
  setInterval(() => { drainOutbox().catch((err) => logger.error({ err }, 'outbox poller failed')); }, 1000);

  // periodic TTL sweep for cascade-blocked road segments (§7 W5)
  setInterval(() => { enqueueJob('APPLY_CASCADE_TTL_SWEEP', {}).catch(() => {}); }, 30_000);

  httpServer.listen(env.PORT, () => {
    logger.info(`Prahari API listening on :${env.PORT}`);
  });
}

main().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
