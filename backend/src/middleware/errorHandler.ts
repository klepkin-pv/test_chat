import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger.js';

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id']?.toString() || randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'Not found',
    requestId: req.requestId,
  });
}

export function errorHandler(error: unknown, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    next(error);
    return;
  }

  const isCorsError = error instanceof Error && error.message.startsWith('CORS blocked for origin:');
  const statusCode =
    typeof error === 'object' &&
    error !== null &&
    ('statusCode' in error || 'status' in error)
      ? Number((error as { statusCode?: number; status?: number }).statusCode ?? (error as { status?: number }).status)
      : isCorsError
        ? 403
        : 500;

  const safeStatus = Number.isFinite(statusCode) && statusCode >= 400 ? statusCode : 500;
  const message =
    error instanceof Error
      ? (safeStatus >= 500 ? 'Internal server error' : error.message)
      : 'Internal server error';

  logger.error(`Request failed ${req.method} ${req.originalUrl}`, {
    requestId: req.requestId,
    statusCode: safeStatus,
    error,
  });

  res.status(safeStatus).json({
    error: message,
    requestId: req.requestId,
  });
}
