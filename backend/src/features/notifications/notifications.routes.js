import { Router } from 'express';
import * as notificationsController from './notifications.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/', notificationsController.getNotifications);
router.patch('/read-all', notificationsController.markAllAsRead);
router.patch('/:id/read', notificationsController.markAsRead);
router.delete('/clear-all', notificationsController.clearAllNotifications);
router.delete('/:id', notificationsController.deleteNotification);

export default router;
