import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import * as bookingService from '../services/bookingService';
import { BookingError } from '../services/bookingService';

// Validation schema

const createBookingSchema = z.object({
  amenity_id:   z.string().min(1),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
  start_time:   z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:MM'),
  end_time:     z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:MM'),
  notes:        z.string().optional(),
});

const adminFilterSchema = z.object({
  amenity_id: z.string().optional(),
  date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status:     z.enum(['confirmed', 'cancelled', 'completed']).optional(),
});

// Controllers

export async function createBooking(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input      = createBookingSchema.parse(req.body);
    const userId     = req.user!.userId;
    const buildingId = req.user!.buildingId;
    const booking    = await bookingService.createBooking(userId, buildingId, input);

    res.status(201).json({ success: true, data: booking });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: error.issues });
      return;
    }

    if (error instanceof BookingError) {
      if (error.code === 'AMENITY_NOT_FOUND') {
        res.status(404).json({ success: false, message: error.message });
        return;
      }
      if (error.code === 'AMENITY_NOT_ACTIVE') {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
      if (error.code === 'SLOT_FULL') {
        res.status(409).json({ success: false, message: error.message });
        return;
      }
      if (error.code === 'USER_ALREADY_BOOKED') {
        res.status(409).json({ success: false, message: error.message });
        return;
      }
      if (error.code === 'TOO_FAR_IN_ADVANCE') {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
      if (error.code === 'PAST_SLOT') {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
    }

    next(error);
  }
}

export async function getMyBookings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await bookingService.getMyBookings(userId);

    res.status(200).json({ success: true, data: result });
  } catch (error: unknown) {
    next(error);
  }
}

export async function cancelBooking(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const bookingId  = req.params.id as string;
    const userId     = req.user!.userId;
    const buildingId = req.user!.buildingId;
    const userRole   = req.user!.role;
    const booking    = await bookingService.cancelBooking(
      bookingId, userId, buildingId, userRole
    );

    res.status(200).json({ success: true, data: booking });
  } catch (error: unknown) {
    if (error instanceof BookingError) {
      if (error.code === 'BOOKING_NOT_FOUND') {
        res.status(404).json({ success: false, message: error.message });
        return;
      }
      if (error.code === 'UNAUTHORIZED') {
        res.status(403).json({ success: false, message: error.message });
        return;
      }
      if (error.code === 'ALREADY_CANCELLED') {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
      if (error.code === 'PAST_BOOKING') {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
    }

    next(error);
  }
}

export async function getAdminBookings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const buildingId = req.user!.buildingId;
    const filters    = adminFilterSchema.parse(req.query);
    const bookings   = await bookingService.getAdminBookings(buildingId, filters);

    res.status(200).json({ success: true, data: bookings });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: error.issues });
      return;
    }
    next(error);
  }
}