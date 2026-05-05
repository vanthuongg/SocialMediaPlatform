// [auto] Admin route definitions
import { Router } from 'express';
import * as adminController from './admin.controller.js';
import { authenticate, authorize } from '../../shared/middlewares/auth.middleware.js';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// ── Shared: admin + moderator ─────────────────────────────────────────────────
router.get('/dashboard', authorize('admin', 'moderator'), adminController.getDashboard);
router.get('/users', authorize('admin'), adminController.getUsers);
router.patch('/users/:id/ban', authorize('admin'), adminController.banUser);
router.post('/users/:id/warn', authorize('admin'), adminController.warnUser);
router.get('/reports', authorize('admin', 'moderator'), adminController.getReports);
router.patch('/reports/:id', authorize('admin', 'moderator'), adminController.reviewReport);
router.get('/posts', authorize('admin', 'moderator'), adminController.getPosts);
router.delete('/posts/:id', authorize('admin', 'moderator'), adminController.deletePost);
router.get('/reels', authorize('admin', 'moderator'), adminController.getReels);
router.delete('/reels/:id', authorize('admin', 'moderator'), adminController.deleteReel);
router.get('/groups', authorize('admin', 'moderator'), adminController.getGroups);
router.patch('/groups/:id/ban', authorize('admin'), adminController.banGroup);

// ── Admin-only ────────────────────────────────────────────────────────────────
router.get('/analytics', authorize('admin'), adminController.getAnalytics);
router.patch('/users/:id/role', authorize('admin'), adminController.changeUserRole);
router.delete('/users/:id', authorize('admin'), adminController.deleteUser);
router.post('/accounts', authorize('admin'), adminController.createAccount);

export default router;
