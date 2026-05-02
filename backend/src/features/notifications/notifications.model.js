import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['reaction', 'comment', 'reply', 'friend_request', 'friend_accept', 'follow', 'mention', 'share', 'tag'],
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    entity: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'entityModel',
    },
    entityModel: {
      type: String,
      enum: ['Post', 'Comment', 'User', 'Reel', 'GroupPost'],
    },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
