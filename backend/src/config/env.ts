import 'dotenv/config';
import { z } from 'zod';

const positiveInt = (fallback: number) => z.coerce.number().int().positive().default(fallback);

export const env = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: positiveInt(5000),
    LOG_LEVEL: z.string().default('info'),
    CORS_ORIGIN: z.string().default('http://localhost:3000'),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    SEED_USER_COUNT: positiveInt(100_000),
    RECIPIENT_BATCH_SIZE: positiveInt(1000),
    NOTIFICATION_WORKER_CONCURRENCY: positiveInt(20),
    MAX_NOTIFICATION_RETRIES: positiveInt(3),
    PROCESSING_TIMEOUT_SECONDS: positiveInt(300),
    RECONCILE_INTERVAL_SECONDS: positiveInt(5),
  })
  .parse(process.env);
