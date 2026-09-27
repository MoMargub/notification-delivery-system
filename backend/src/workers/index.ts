import { Worker, Job } from 'bullmq';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { CAMPAIGN_QUEUE, NOTIFICATION_QUEUE, campaignQueue, connection } from '../queue';
import { expandCampaign } from './campaignProcessor';
import { runMaintenance } from './maintenance';
import { processNotification } from './notificationProcessor';

const campaignWorker = new Worker(
  CAMPAIGN_QUEUE,
  (job) => (job.name === 'reconcile' ? runMaintenance() : expandCampaign(job.data.campaignId)),
  { connection, concurrency: 3 },
);

const notificationWorker = new Worker(
  NOTIFICATION_QUEUE,
  (job) => processNotification(job.data.notificationId),
  { connection, concurrency: env.NOTIFICATION_WORKER_CONCURRENCY },
);

campaignWorker.on('failed', async (job: Job | undefined, err: Error) => {
  logger.error({ err, jobId: job?.id }, 'campaign job failed');
  if (job?.name === 'expand' && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    await prisma.campaign.updateMany({
      where: { id: job.data.campaignId, status: { in: ['PENDING', 'PROCESSING'] } },
      data: { status: 'FAILED', completedAt: new Date() },
    });
  }
});
notificationWorker.on('failed', (job: Job | undefined, err: Error) =>
  logger.warn({ notificationId: job?.data.notificationId, attemptsMade: job?.attemptsMade, err: err.message }, 'notification attempt failed'),
);

campaignQueue
  .upsertJobScheduler(
    'maintenance',
    { every: env.RECONCILE_INTERVAL_SECONDS * 1000 },
    { name: 'reconcile', opts: { removeOnComplete: true, removeOnFail: true } },
  )
  .then(() => logger.info({ concurrency: env.NOTIFICATION_WORKER_CONCURRENCY }, 'workers started'));

async function shutdown() {
  await Promise.all([campaignWorker.close(), notificationWorker.close()]);
  await Promise.all([campaignQueue.close(), prisma.$disconnect()]);
  connection.disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
