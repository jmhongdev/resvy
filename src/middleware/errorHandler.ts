import { Request, Response, NextFunction } from 'express';

// Custom error class to attach an HTTP status code
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// This middleware has four parameters (err, req, res, next)
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Unexpected errors
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};