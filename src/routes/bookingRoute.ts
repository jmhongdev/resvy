import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authenticate';
import * as bookingController from '../controllers/bookingController';

const router = Router();

router.use(authenticate);

// GET /bookings/my  this is a resident's own bookings
// This must be defined BEFORE /:id to avoid "my" being treated as an id
router.get('/my',   bookingController.getMyBookings);

// POST /bookings    create a booking
router.post('/',    bookingController.createBooking);

// PATCH /bookings/:id/cancel   cancel a booking
router.patch('/:id/cancel', bookingController.cancelBooking);

// GET /bookings/admin          admin view of all bookings
router.get('/admin', requireAdmin, bookingController.getAdminBookings);

export default router;