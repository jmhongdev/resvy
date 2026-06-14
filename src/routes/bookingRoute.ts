import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authenticate';
import * as bookingController from '../controllers/bookingController';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /bookings/my:
 *   get:
 *     tags: [Bookings]
 *     summary: Get current resident's upcoming and past bookings
 *     responses:
 *       200:
 *         description: Upcoming and past bookings
 *       401:
 *         description: Not authenticated
 */
router.get('/my', bookingController.getMyBookings);

/**
 * @openapi
 * /bookings/admin:
 *   get:
 *     tags: [Bookings]
 *     summary: Get all bookings for the building (admin only)
 *     parameters:
 *       - in: query
 *         name: amenity_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *           example: '2026-05-10'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [confirmed, cancelled, completed]
 *     responses:
 *       200:
 *         description: List of bookings
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin access required
 */
router.get('/admin', requireAdmin, bookingController.getAdminBookings);

/**
 * @openapi
 * /bookings:
 *   post:
 *     tags: [Bookings]
 *     summary: Create a new booking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amenity_id, booking_date, start_time, end_time]
 *             properties:
 *               amenity_id:   { type: string, format: uuid }
 *               booking_date: { type: string, format: date, example: '2026-05-10' }
 *               start_time:   { type: string, example: '09:00' }
 *               end_time:     { type: string, example: '10:00' }
 *               notes:        { type: string }
 *     responses:
 *       201:
 *         description: Booking created
 *       400:
 *         description: Past slot or too far in advance
 *       401:
 *         description: Not authenticated
 *       409:
 *         description: Slot already booked
 */
router.post('/', bookingController.createBooking);

/**
 * @openapi
 * /bookings/{id}/cancel:
 *   patch:
 *     tags: [Bookings]
 *     summary: Cancel a booking
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Booking cancelled
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Can only cancel your own bookings
 *       404:
 *         description: Booking not found
 */
router.patch('/:id/cancel', bookingController.cancelBooking);

export default router;