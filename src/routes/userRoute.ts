import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import * as userController from '../controllers/userController';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get current user profile
 *     responses:
 *       200:
 *         description: User profile with building info
 *       401:
 *         description: Not authenticated
 */
router.get('/me', userController.getProfile);

/**
 * @openapi
 * /users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Update display name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *     responses:
 *       200:
 *         description: Name updated successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Not authenticated
 */
router.patch('/me', userController.updateName);

/**
 * @openapi
 * /users/me/password:
 *   patch:
 *     tags: [Users]
 *     summary: Change password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Current password incorrect or not authenticated
 */
router.patch('/me/password', userController.changePassword);

export default router;