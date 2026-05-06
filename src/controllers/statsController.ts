import { Request, Response, NextFunction } from 'express';
import * as statsService from '../services/statsService';

export async function getOverview(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const buildingId = req.user!.buildingId;
    const data       = await statsService.getOverview(buildingId);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getAmenityStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const buildingId = req.user!.buildingId;
    const data       = await statsService.getAmenityStats(buildingId);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getPeakHours(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const buildingId = req.user!.buildingId;
    const data       = await statsService.getPeakHours(buildingId);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getMonthlyTrends(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const buildingId = req.user!.buildingId;
    const data       = await statsService.getMonthlyTrends(buildingId);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    next(error);
  }
}

export async function getResidentStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const buildingId = req.user!.buildingId;
    const data       = await statsService.getResidentStats(buildingId);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    next(error);
  }
}