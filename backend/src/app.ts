import cors from 'cors';
import express from 'express';
import { pinoHttp } from 'pino-http';
import { prisma } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler, notFound } from './middleware/errorHandler';
import { campaignsRouter } from './modules/campaigns/campaigns.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';
import { usersRouter } from './modules/users/users.routes';
import { connection, notificationQueue } from './queue';

export const app = express();

app.use(pinoHttp({ logger }));
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', async (_req, res) => {
  const up = (check: Promise<unknown>) =>
    check.then(
      () => 'up',
      () => 'down',
    );
  const [postgres, redis] = await Promise.all([up(prisma.$queryRaw`SELECT 1`), up(connection.ping())]);
  // Delayed and queued jobs only run while a worker process is connected to Redis.
  const worker = redis === 'up' && (await notificationQueue.getWorkers().catch(() => [])).length > 0 ? 'up' : 'down';
  const healthy = postgres === 'up' && redis === 'up';
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    checks: { api: 'up', postgres, redis, worker },
  });
});

app.use('/api/campaigns', campaignsRouter);
app.use('/api/users', usersRouter);
app.use('/api/notifications', notificationsRouter);

app.use(notFound);
app.use(errorHandler);
