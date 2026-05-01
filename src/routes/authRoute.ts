import { Router } from 'express';
import * as authController from '../controllers/authController';

const router = Router();

// POST /auth/register
router.post('/register', authController.register);

// POST /auth/login
router.post('/login', authController.login);

// POST /auth/refresh
router.post('/refresh', authController.refresh);

export default router;