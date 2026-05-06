import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authenticate';
import * as statsController from '../controllers/statsController';

const router = Router();

// All stats are admin only
router.use(authenticate);
router.use(requireAdmin);

router.get('/overview',        statsController.getOverview);
router.get('/amenities',       statsController.getAmenityStats);
router.get('/peak-hours',      statsController.getPeakHours);
router.get('/monthly-trends',  statsController.getMonthlyTrends);
router.get('/residents',       statsController.getResidentStats);

export default router;