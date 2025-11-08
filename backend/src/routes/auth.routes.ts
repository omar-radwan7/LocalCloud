import { Router } from 'express';
import { AuthController } from '../modules/auth/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));

// Protected routes
router.get('/profile', authenticate, (req, res) => authController.getProfile(req, res));
router.put('/profile', authenticate, (req, res) => authController.updateProfile(req, res));

export default router;

