import { Router } from 'express';
import * as authController from './auth.controller.js';
import { validate, registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.validation.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { authLimiter, refreshTokenLimiter } from '../../shared/middlewares/rateLimiter.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/refresh-token', refreshTokenLimiter, authController.refreshToken);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password/:token', authLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);
router.get('/me', authenticate, authController.getMe);

export default router;
