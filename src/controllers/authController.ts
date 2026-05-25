import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ZodError } from 'zod';
import * as authService from '../services/authService';

// Validation schemas

const registerSchema = z.object({
  name:          z.string().min(2).max(100),
  email:         z.string().email(),
  password:      z.string().min(8).max(100),
  building_code: z.string().min(1),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// Helper

// Converts any thrown value into a readable error message string
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'UNKNOWN_ERROR';
}

// Controllers

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data:    result,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors:  error.issues,
      });
      return;
    }

    const message = getErrorMessage(error);

    if (message === 'INVALID_BUILDING_CODE') {
      res.status(404).json({ success: false, message: 'Building code not found' });
      return;
    }
    if (message === 'EMAIL_ALREADY_EXISTS') {
      res.status(409).json({ success: false, message: 'Email already registered' });
      return;
    }

    next(error);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data:    result,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors:  error.issues,
      });
      return;
    }

    const message = getErrorMessage(error);

    if (message.startsWith('INVALID_CREDENTIALS')) {
      // Message format: INVALID_CREDENTIALS:attemptsRemaining
      const parts    = message.split(':');
      const remaining = parts[1] ? ` ${parts[1]} attempt(s) remaining.` : '';
      res.status(401).json({
        success: false,
        message: `Invalid email or password.${remaining}`,
      });
      return;
    }

    if (message.startsWith('ACCOUNT_LOCKED')) {
      const parts   = message.split(':');
      const minutes = parts[1] ?? '15';
      res.status(423).json({
        success: false,
        message: `Account locked due to too many failed attempts. Try again in ${minutes} minute(s).`,
      });
      return;
    }

    next(error);
  }
}

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await authService.refresh(refreshToken);

    res.status(200).json({
      success: true,
      data:    result,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors:  error.issues,
      });
      return;
    }

    const message = getErrorMessage(error);

    if (message === 'INVALID_REFRESH_TOKEN') {
      res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
      return;
    }

    next(error);
  }
}