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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     upcoming:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Booking'
 *                     past:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Booking'
 */
router.get('/my', bookingController.getMyBookings);

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
 *               amenity_id:   { type: string }
 *               booking_date: { type: string, example: '2026-05-10' }
 *               start_time:   { type: string, example: '09:00' }
 *               end_time:     { type: string, example: '10:00' }
 *               notes:        { type: string }
 *     responses:
 *       201:
 *         description: Booking created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
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
 *     responses:
 *       200:
 *         description: Booking cancelled
 *       403:
 *         description: Can only cancel your own bookings
 *       404:
 *         description: Booking not found
 */
router.patch('/:id/cancel', bookingController.cancelBooking);

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
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           example: '2026-05-10'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [confirmed, cancelled, completed]
 *     responses:
 *       200:
 *         description: List of bookings
 *       403:
 *         description: Admin access required
 */
router.get('/admin', requireAdmin, bookingController.getAdminBookings);

export default router;