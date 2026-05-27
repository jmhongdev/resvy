import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import * as bookingService from '../services/bookingService';

//Validation schemas
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

//Helper
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'UNKNOWN_ERROR';
}

//Controllers
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
    const message = getErrorMessage(error);
    if (message === 'AMENITY_NOT_FOUND') {
      res.status(404).json({ success: false, message: 'Amenity not found' });
      return;
    }
    if (message === 'AMENITY_NOT_ACTIVE') {
      res.status(400).json({ success: false, message: 'Amenity is not active' });
      return;
    }
    if (message === 'SLOT_ALREADY_BOOKED') {
      res.status(409).json({ success: false, message: 'This slot is already booked' });
      return;
    }
    if (message === 'USER_ALREADY_BOOKED') {
      res.status(409).json({ success: false, message: 'You already have a booking for this amenity on this date' });
      return;
    }
    if (message === 'TOO_FAR_IN_ADVANCE') {
      res.status(400).json({ success: false, message: 'Booking too far in advance' });
      return;
    }
    if (message === 'PAST_DATE') {
      res.status(400).json({ success: false, message: 'Cannot book a past date' });
      return;
    }
    if (message === 'PAST_SLOT') {
    res.status(400).json({ success: false, message: 'Cannot book a time slot that has already passed' });
    return;
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
    const userId  = req.user!.userId;
    const result  = await bookingService.getMyBookings(userId);

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
    const bookingId = req.params.id as string;
    const userId    = req.user!.userId;
    const buildingId = req.user!.buildingId;
    const userRole   = req.user!.role;
    const booking   = await bookingService.cancelBooking(bookingId, userId, buildingId, userRole);

    res.status(200).json({ success: true, data: booking });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message === 'BOOKING_NOT_FOUND') {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }
    if (message === 'UNAUTHORIZED') {
      res.status(403).json({ success: false, message: 'You can only cancel your own bookings' });
      return;
    }
    if (message === 'ALREADY_CANCELLED') {
      res.status(400).json({ success: false, message: 'Booking is already cancelled' });
      return;
    }
    if (message === 'PAST_BOOKING') {
      res.status(400).json({ success: false, message: 'Cannot cancel a past booking' });
      return;
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