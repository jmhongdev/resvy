import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authenticate';
import * as amenityController from '../controllers/amenityController';

const router = Router();

// All amenity routes require a logged in user
router.use(authenticate);

// GET /amenities — all residents can list amenities
router.get('/', amenityController.getAmenities);

// GET /amenities/:id — get single amenity
router.get('/:id', amenityController.getAmenity);

// GET /amenities/:id/availability?date=YYYY-MM-DD
router.get('/:id/availability', amenityController.getAvailability);

// Admin only routes below
router.post('/',        requireAdmin, amenityController.createAmenity);
router.patch('/:id',    requireAdmin, amenityController.updateAmenity);
router.delete('/:id',   requireAdmin, amenityController.deactivateAmenity);

export default router;