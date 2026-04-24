import Conversation from './conversation.model.js';
import Message from './message.model.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors/index.js';
import { cursorPaginate, paginate } from '../../shared/utils/pagination.utils.js';
import { getIO } from '../../socket/index.js';
import { uploadToCloudinary } from '../../shared/utils/cloudinary.utils.js';

/**
 * Gets all conversations for a user, sorted by most recent.
 */
export async function getConversations(userId) {
  const conversations = await Conversation.find({ participants: userId })
    .populate('participants', 'name username avatar isOnline lastSeen')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1 })
    .lean();

  return conversations;
}

/**
 * Creates or finds an existing 1-on-1 conversation.
 */
export async function getOrCreateConversation(userId, targetUserId) {
  let conversation = await Conversation.findOne({
    participants: { $all: [userId, targetUserId], $size: 2 },
    isGroupChat: false,
  }).populate('participants', 'name username avatar isOnline');

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [userId, targetUserId],
      isGroupChat: false,
    });
    conversation = await conversation.populate('participants', 'name username avatar isOnline');
  }

  return conversation;
}

/**
 * Gets messages in a conversation with cursor pagination.
 */
export async function getMessages(conversationId, userId, query) {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) throw new NotFoundError('Conversation');

  const { query: cursorQuery, limit } = cursorPaginate(query.cursor, query.limit || 30);

  const messages = await Message.find({
    conversation: conversationId,
    isDeleted: false,
    ...cursorQuery,
  })
    .populate('sender', 'name username avatar')
    .populate('replyTo', 'content sender')
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .lean();

  const hasNextPage = messages.length > limit;
  const data = hasNextPage ? messages.slice(0, limit) : messages;
  const nextCursor = hasNextPage ? data[data.length - 1]._id : null;

  // Mark messages as read
  const updateResult = await Message.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: userId },
      'readBy.user': { $ne: userId },
    },
    { $push: { readBy: { user: userId } } }
  );

  // Emit read receipt only if there were unread messages
  if (updateResult.modifiedCount > 0) {
    const io = getIO();
    if (io) {
      io.to(`conversation:${conversationId}`).emit('message:read', {
        conversationId,
        readBy: userId,
      });
    }
  }

  return { messages: data.reverse(), nextCursor, hasNextPage };
}

/**
 * Sends a message in a conversation and emits via Socket.IO.
 */
export async function sendMessage(conversationId, senderId, data, file) {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: senderId,
  });

  if (!conversation) throw new NotFoundError('Conversation');

  let media = undefined;
  if (file) {
    const uploadResult = await uploadToCloudinary(file.buffer, {
      folder: 'nova/messages',
    });
    
    let type = 'file';
    if (file.mimetype.startsWith('image/')) type = 'image';
    else if (file.mimetype.startsWith('video/')) type = 'video';
    else if (file.mimetype.startsWith('audio/')) type = 'audio';

    media = {
      url: uploadResult.secure_url,
      type,
      publicId: uploadResult.public_id,
      fileName: file.originalname,
    };
  }

  const message = await Message.create({
    conversation: conversationId,
    sender: senderId,
    content: data.content || '',
    media,
    replyTo: data.replyTo || null,
  });

  const populated = await message.populate('sender', 'name username avatar');

  // Update conversation metadata
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: message._id,
    lastMessageAt: new Date(),
  });

  // Emit to all conversation participants via Socket.IO
  const io = getIO();
  if (io) {
    conversation.participants.forEach((participantId) => {
      const pid = participantId.toString();
      io.to(`user:${pid}`).emit('message:new', {
        conversationId,
        message: populated,
      });
    });
  }

  return populated;
}

/**
 * Toggles the pinned status of a message.
 */
export async function togglePinMessage(conversationId, messageId, userId) {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) throw new NotFoundError('Conversation');

  const message = await Message.findOne({ _id: messageId, conversation: conversationId });
  if (!message) throw new NotFoundError('Message');

  message.isPinned = !message.isPinned;
  await message.save();

  const populated = await message.populate('sender', 'name username avatar');

  // Emit to all conversation participants via Socket.IO
  const io = getIO();
  if (io) {
    conversation.participants.forEach((participantId) => {
      const pid = participantId.toString();
      io.to(`user:${pid}`).emit('message:update', {
        conversationId,
        message: populated,
      });
    });
  }

  return populated;
}

/**
 * Creates a new group conversation.
 */
export async function createGroupConversation(adminId, data) {
  const participants = [adminId, ...data.participants];
  const uniqueParticipants = [...new Set(participants.map(id => id.toString()))];

  const conversation = await Conversation.create({
    participants: uniqueParticipants,
    isGroupChat: true,
    groupName: data.groupName || 'New Group Chat',
    groupAdmin: adminId,
    lastMessageAt: new Date(),
  });

  const populated = await conversation.populate('participants', 'name username avatar isOnline lastSeen');

  // Emit to all conversation participants via Socket.IO
  const io = getIO();
  if (io) {
    uniqueParticipants.forEach((participantId) => {
      io.to(`user:${participantId}`).emit('conversation:new', populated);
    });
  }

  return populated;
}

/**
 * Soft-deletes a message. Only the original sender may delete their own message.
 */
export async function deleteMessage(messageId, userId) {
  const message = await Message.findById(messageId);
  if (!message) throw new NotFoundError('Message');
  if (message.isDeleted) throw new NotFoundError('Message');

  if (message.sender.toString() !== userId.toString()) {
    throw new ForbiddenError('You can only delete your own messages');
  }

  message.isDeleted = true;
  message.content = '';
  await message.save();

  // Notify conversation participants in real-time
  const io = getIO();
  if (io) {
    io.to(`conversation:${message.conversation.toString()}`).emit('message:deleted', {
      messageId,
      conversationId: message.conversation.toString(),
    });
  }

  return message;
}
