import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/errors';

export { AppError };

export const errorHandler = (
  err:   Error,
  req:   Request,
  res:   Response,
  _next: NextFunction
): void => {

  // Handle known application errors. 
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Handle PostgreSQL errors
  if ('code' in err) {
    const pgError = err as { code: string; detail?: string };

    if (pgError.code === '23505') {
      res.status(409).json({
        success: false,
        message: 'A record with this value already exists',
      });
      return;
    }

    if (pgError.code === '23503') {
      res.status(400).json({
        success: false,
        message: 'Referenced record does not exist',
      });
      return;
    }
  }

  // Unexpected error, log it with context and return generic message
  // Never send stack traces or internal details to the client
  console.error({
    message: err.message,
    stack:   err.stack,
    path:    req.path,
    method:  req.method,
    time:    new Date().toISOString(),
  });

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};