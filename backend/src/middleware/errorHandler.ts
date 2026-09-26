import { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { logger } from '../config/logger';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `Route not found: ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Validation failed',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { message: err.message } });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { message: 'Malformed JSON body' } });
    return;
  }
  logger.error({ err }, 'unhandled error');
  res.status(500).json({
    error: { message: 'Internal server error', ...(env.NODE_ENV !== 'production' && { detail: String(err) }) },
  });
};
