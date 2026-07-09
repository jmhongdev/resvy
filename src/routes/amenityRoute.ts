import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/authenticate';
import * as amenityController from '../controllers/amenityController';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /amenities:
 *   get:
 *     tags: [Amenities]
 *     summary: List all amenities for the resident's building
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or description
 *       - in: query
 *         name: min_capacity
 *         schema:
 *           type: integer
 *         description: Minimum capacity filter
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *       - in: query
 *         name: available_today
 *         schema:
 *           type: boolean
 *         description: Only show amenities with available slots today
 *     responses:
 *       200:
 *         description: List of amenities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Amenity'
 *       401:
 *         description: Not authenticated
 */
router.get('/', amenityController.getAmenities);

/**
 * @openapi
 * /amenities/{id}/availability:
 *   get:
 *     tags: [Amenities]
 *     summary: Get available time slots for an amenity on a given date
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: '2026-05-10'
 *     responses:
 *       200:
 *         description: Available slots
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Amenity not found
 */
router.get('/:id/availability', amenityController.getAvailability);

/**
 * @openapi
 * /amenities/{id}:
 *   get:
 *     tags: [Amenities]
 *     summary: Get a single amenity by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Amenity details
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Amenity not found
 */
router.get('/:id', amenityController.getAmenity);

/**
 * @openapi
 * /amenities:
 *   post:
 *     tags: [Amenities]
 *     summary: Create a new amenity (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Amenity'
 *     responses:
 *       201:
 *         description: Amenity created
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin access required
 */
router.post('/',      requireAdmin, amenityController.createAmenity);

/**
 * @openapi
 * /amenities/{id}:
 *   patch:
 *     tags: [Amenities]
 *     summary: Update an amenity (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Amenity updated
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Amenity not found
 */
router.patch('/:id',  requireAdmin, amenityController.updateAmenity);

/**
 * @openapi
 * /amenities/{id}:
 *   delete:
 *     tags: [Amenities]
 *     summary: Deactivate an amenity (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Amenity deactivated
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Amenity not found
 */
router.delete('/:id', requireAdmin, amenityController.deactivateAmenity);

/**
 * @openapi
 * /amenities/{id}/closures:
 *   get:
 *     tags: [Amenities]
 *     summary: Get closed weekdays and holiday dates for an amenity in a date range
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: from
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Closed weekdays and holidays
 *       401:
 *         description: Not authenticated
 */
router.get('/:id/closures', amenityController.getClosures);

/**
 * @openapi
 * /amenities/{id}/settings:
 *   patch:
 *     tags: [Amenities]
 *     summary: Update amenity booking window and closed weekdays (admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Settings updated
 *       403:
 *         description: Admin access required
 */
router.patch('/:id/settings',          requireAdmin, amenityController.updateAmenitySettings);

/**
 * @openapi
 * /amenities/{id}/holidays:
 *   get:
 *     tags: [Amenities]
 *     summary: Get all holidays for an amenity (admin only)
 *   post:
 *     tags: [Amenities]
 *     summary: Add a holiday to an amenity (admin only)
 */
router.get('/:id/holidays',            requireAdmin, amenityController.getAmenityHolidays);
router.post('/:id/holidays',           requireAdmin, amenityController.addAmenityHoliday);
router.delete('/:id/holidays/:date',   requireAdmin, amenityController.deleteAmenityHoliday);

export default router;