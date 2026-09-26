// Runs before each test file: point the app at the isolated test schema.
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:1234@localhost:5432/notifications?schema=test';
process.env.RECIPIENT_BATCH_SIZE = '3';
process.env.MAX_NOTIFICATION_RETRIES = '3';
process.env.PROCESSING_TIMEOUT_SECONDS = '300';
