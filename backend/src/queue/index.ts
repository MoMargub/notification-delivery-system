import { JobsOptions, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';

export const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const CAMPAIGN_QUEUE = 'campaignQueue';
export const NOTIFICATION_QUEUE = 'notificationQueue';

export const campaignQueue = new Queue(CAMPAIGN_QUEUE, { connection });
export const notificationQueue = new Queue(NOTIFICATION_QUEUE, { connection });

// The database is the source of truth, so finished jobs are not kept in Redis.
// That also frees the deterministic jobId so a job can be re-enqueued later.
const base: JobsOptions = { removeOnComplete: true, removeOnFail: true };

export const campaignJobOptions = (campaignId: string, delay = 0): JobsOptions => ({
  ...base,
  jobId: `campaign-${campaignId}`,
  delay,
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
});

export const notificationJob = (notificationId: number) => ({
  name: 'send',
  data: { notificationId },
  opts: {
    ...base,
    jobId: `notification-${notificationId}`,
    attempts: env.MAX_NOTIFICATION_RETRIES,
    backoff: { type: 'exponential', delay: 1000 },
  } satisfies JobsOptions,
});
