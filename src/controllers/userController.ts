import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import * as userService from '../services/userService';
import { UserError } from '../services/userService';

// Validation schemas

const updateNameSchema = z.object({
  name: z.string().min(2).max(100),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
});

// Controllers

export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const data   = await userService.getProfile(userId);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    if (error instanceof UserError) {
      if (error.code === 'USER_NOT_FOUND') {
        res.status(404).json({ success: false, message: error.message });
        return;
      }
    }
    next(error);
  }
}

export async function updateName(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId   = req.user!.userId;
    const { name } = updateNameSchema.parse(req.body);
    const data     = await userService.updateName(userId, name);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: error.issues });
      return;
    }
    if (error instanceof UserError) {
      if (error.code === 'USER_NOT_FOUND') {
        res.status(404).json({ success: false, message: error.message });
        return;
      }
    }
    next(error);
  }
}

export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await userService.changePassword(userId, currentPassword, newPassword);
    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: error.issues });
      return;
    }
    if (error instanceof UserError) {
      if (error.code === 'WRONG_CURRENT_PASSWORD') {
        res.status(401).json({ success: false, message: error.message });
        return;
      }
      if (error.code === 'USER_NOT_FOUND') {
        res.status(404).json({ success: false, message: error.message });
        return;
      }
    }
    next(error);
  }
}