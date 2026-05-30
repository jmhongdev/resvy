import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import * as userController from '../controllers/userController';

const router = Router();

router.use(authenticate);

// GET /users/me     gets current user profile
router.get('/me', userController.getProfile);

// PATCH /users/me    updates name
router.patch('/me', userController.updateName);

// PATCH /users/me/password    changes password
router.patch('/me/password', userController.changePassword);

export default router;