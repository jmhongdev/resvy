import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authenticate';
import * as statsController from '../controllers/statsController';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

/**
 * @openapi
 * /stats/overview:
 *   get:
 *     tags: [Stats]
 *     summary: Building overview stats (admin only)
 *     responses:
 *       200:
 *         description: Overview statistics
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin access required
 */
router.get('/overview', statsController.getOverview);

/**
 * @openapi
 * /stats/amenities:
 *   get:
 *     tags: [Stats]
 *     summary: Amenity utilization rates (admin only)
 *     responses:
 *       200:
 *         description: Utilization stats per amenity
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin access required
 */
router.get('/amenities', statsController.getAmenityStats);

/**
 * @openapi
 * /stats/peak-hours:
 *   get:
 *     tags: [Stats]
 *     summary: Peak booking hours (admin only)
 *     responses:
 *       200:
 *         description: Booking count per hour
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin access required
 */
router.get('/peak-hours', statsController.getPeakHours);

/**
 * @openapi
 * /stats/monthly-trends:
 *   get:
 *     tags: [Stats]
 *     summary: Monthly booking trends (admin only)
 *     responses:
 *       200:
 *         description: Monthly booking counts for last 6 months
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin access required
 */
router.get('/monthly-trends', statsController.getMonthlyTrends);

/**
 * @openapi
 * /stats/residents:
 *   get:
 *     tags: [Stats]
 *     summary: Resident activity stats (admin only)
 *     responses:
 *       200:
 *         description: Booking activity per resident
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin access required
 */
router.get('/residents', statsController.getResidentStats);

export default router;