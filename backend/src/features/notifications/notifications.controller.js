import * as notificationsService from './notifications.service.js';
import { sendSuccess, sendPaginated } from '../../shared/utils/response.utils.js';

export async function getNotifications(req, res, next) {
  try {
    const { notifications, meta, unreadCount } = await notificationsService.getNotifications(req.user._id, req.query);
    sendPaginated(res, notifications, { ...meta, unreadCount });
  } catch (err) { next(err); }
}

export async function markAllAsRead(req, res, next) {
  try {
    await notificationsService.markAllAsRead(req.user._id);
    sendSuccess(res, { message: 'All notifications marked as read' });
  } catch (err) { next(err); }
}

export async function markAsRead(req, res, next) {
  try {
    await notificationsService.markAsRead(req.params.id, req.user._id);
    sendSuccess(res, { message: 'Notification marked as read' });
  } catch (err) { next(err); }
}

export async function deleteNotification(req, res, next) {
  try {
    await notificationsService.deleteNotification(req.params.id, req.user._id);
    sendSuccess(res, { message: 'Notification deleted' });
  } catch (err) { next(err); }
}

export async function clearAllNotifications(req, res, next) {
  try {
    await notificationsService.clearAllNotifications(req.user._id);
    sendSuccess(res, { message: 'All notifications cleared' });
  } catch (err) { next(err); }
}
