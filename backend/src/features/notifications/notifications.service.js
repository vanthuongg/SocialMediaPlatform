import Notification from './notifications.model.js';
import { getIO } from '../../socket/index.js';
import { paginate } from '../../shared/utils/pagination.utils.js';
import { NotFoundError } from '../../shared/errors/index.js';

/**
 * Creates a notification and emits it via Socket.IO.
 */
export async function createNotification(data) {
  const { type, recipient, actor, entity, entityModel, message } = data;

  // Don't notify yourself
  if (recipient.toString() === actor.toString()) return;

  const notification = await Notification.create({
    type,
    recipient,
    actor,
    entity,
    entityModel,
    message,
  });

  const populated = await notification.populate('actor', 'name username avatar');

  // Emit real-time notification
  const io = getIO();
  if (io) {
    io.to(`user:${recipient.toString()}`).emit('notification:new', populated);
  }

  return populated;
}

/**
 * Gets paginated notifications for a user.
 */
export async function getNotifications(userId, paginationQuery) {
  const total = await Notification.countDocuments({ recipient: userId });
  const { skip, limit, meta } = paginate(paginationQuery, total);

  const notifications = await Notification.find({ recipient: userId })
    .populate('actor', 'name username avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

  return { notifications, meta, unreadCount };
}

/**
 * Marks all notifications as read for a user.
 */
export async function markAllAsRead(userId) {
  await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
}

/**
 * Marks a single notification as read.
 */
export async function markAsRead(notificationId, userId) {
  await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true }
  );
}

/**
 * Deletes a single notification for a user.
 */
export async function deleteNotification(notificationId, userId) {
  const result = await Notification.findOneAndDelete({ _id: notificationId, recipient: userId });
  if (!result) throw new NotFoundError('Notification');
}

/**
 * Clears all notifications for a user.
 */
export async function clearAllNotifications(userId) {
  await Notification.deleteMany({ recipient: userId });
}
