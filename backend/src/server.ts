import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';

const server = app.listen(env.PORT, () => logger.info(`API listening on :${env.PORT}`));

process.on('SIGTERM', () => server.close(() => process.exit(0)));
