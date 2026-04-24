import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../features/users/users.model.js';

let io;

/**
 * Initializes Socket.IO with JWT authentication middleware.
 * @param {import('http').Server} httpServer
 */
export function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication token required'));

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.userId).select('_id name username avatar').lean();
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`⚡ Socket connected: ${socket.user.username} (${userId})`);

    // Join personal room for targeted events
    socket.join(`user:${userId}`);

    // Fetch friend list to scope presence events
    const userDoc = await User.findById(userId).select('friends').lean();
    const friendIds = (userDoc?.friends || []).map((id) => id.toString());

    // Mark user online and notify only friends
    User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() }).exec();
    friendIds.forEach((friendId) => {
      io.to(`user:${friendId}`).emit('user:online', userId);
    });

    // ──────── Typing Indicators ────────
    socket.on('typing:start', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        userId,
        user: socket.user,
      });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:stop', { userId });
    });

    // ──────── Join Conversation Room ────────
    socket.on('conversation:join', ({ conversationId }) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('conversation:leave', ({ conversationId }) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // ──────── Call Signaling ────────
    socket.on('call:start', ({ conversationId, targetUserId, type }) => {
      io.to(`user:${targetUserId}`).emit('call:incoming', {
        conversationId,
        caller: socket.user,
        type,
      });
    });

    socket.on('call:accept', ({ conversationId, callerId }) => {
      io.to(`user:${callerId}`).emit('call:accepted', {
        conversationId,
      });
    });

    socket.on('call:decline', ({ conversationId, callerId }) => {
      io.to(`user:${callerId}`).emit('call:declined', {
        conversationId,
      });
    });

    socket.on('call:end', ({ conversationId, targetUserId }) => {
      io.to(`user:${targetUserId}`).emit('call:ended', {
        conversationId,
      });
    });

    // ──────── Disconnect ────────
    socket.on('disconnect', () => {
      console.log(`⚡ Socket disconnected: ${socket.user.username}`);
      User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() }).exec();
      // Notify only friends of offline status
      friendIds.forEach((friendId) => {
        io.to(`user:${friendId}`).emit('user:offline', userId);
      });
    });
  });

  return io;
}

/**
 * Returns the Socket.IO instance (singleton).
 */
export function getIO() {
  return io;
}
