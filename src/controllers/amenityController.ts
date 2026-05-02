import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import * as amenityService from '../services/amenityService';

//Validation schemas
const createAmenitySchema = z.object({
  name:               z.string().min(1).max(100),
  description:        z.string().optional(),
  capacity:           z.number().int().min(1),
  location:           z.string().optional(),
  open_time:          z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:MM'),
  close_time:         z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:MM'),
  slot_duration_mins: z.number().int().min(15).max(480),
  max_advance_days:   z.number().int().min(1).max(90),
});

const updateAmenitySchema = createAmenitySchema.partial().extend({
  is_active: z.boolean().optional(),
});

const availabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
});

//Helper
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'UNKNOWN_ERROR';
}

//Controllers
export async function createAmenity(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const input      = createAmenitySchema.parse(req.body);
    const buildingId = req.user!.buildingId;
    const amenity    = await amenityService.createAmenity(buildingId, input);

    res.status(201).json({ success: true, data: amenity });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, message: 'Validation failed', errors: error.issues });
      return;
    }
    next(error);
  }
}

export async function getAmenities(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const buildingId = req.user!.buildingId;
    const amenities  = await amenityService.getAmenitiesByBuilding(buildingId);

    res.status(200).json({ success: true, data: amenities });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getAmenity(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;
    const buildingId = req.user!.buildingId;
    const amenity    = await amenityService.getAmenityById(id, buildingId);

    res.status(200).json({ success: true, data: amenity });
  } catch (error: unknown) {
    if (getErrorMessage(error) === 'AMENITY_NOT_FOUND') {
      res.status(404).json({ success: false, message: 'Amenity not found' });
      return;
    }
    next(error);
  }
}

export async function updateAmenity(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;
    const buildingId = req.user!.buildingId;
    const input      = updateAmenitySchema.parse(req.body);
    const amenity    = await amenityService.updateAmenity(id, buildingId, input);

    res.status(200).json({ success: true, data: amenity });
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
    if (message === 'NO_FIELDS_TO_UPDATE') {
      res.status(400).json({ success: false, message: 'No fields to update' });
      return;
    }
    next(error);
  }
}

export async function deactivateAmenity(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;
    const buildingId = req.user!.buildingId;
    const amenity    = await amenityService.deactivateAmenity(id, buildingId);

    res.status(200).json({ success: true, data: amenity });
  } catch (error: unknown) {
    if (getErrorMessage(error) === 'AMENITY_NOT_FOUND') {
      res.status(404).json({ success: false, message: 'Amenity not found' });
      return;
    }
    next(error);
  }
}

export async function getAvailability(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;
    const buildingId = req.user!.buildingId;
    const { date }   = availabilitySchema.parse(req.query);
    const result     = await amenityService.getAvailability(id, buildingId, date);

    res.status(200).json({ success: true, data: result });
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
    next(error);
  }
}