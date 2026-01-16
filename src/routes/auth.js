import express from 'express';
import { login, register, checkAuth, logout, getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter, checkAuthLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public routes with rate limiting
router.post('/login', authLimiter, login);
router.post('/login.php', authLimiter, login); // PHP alias
router.post('/register', authLimiter, register);

// Protected routes with rate limiting
router.get('/check-auth', checkAuthLimiter, authenticate, checkAuth);
router.get('/check-auth.php', checkAuthLimiter, authenticate, checkAuth); // PHP alias
router.post('/logout', authenticate, logout);
router.post('/logout.php', authenticate, logout); // PHP alias
router.get('/me', authenticate, getMe);

export default router;
