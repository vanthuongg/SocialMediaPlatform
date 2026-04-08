// [auto] Updated CORS allowed origins
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';

import { env } from './config/env.js';
import { globalErrorHandler } from './shared/middlewares/errorHandler.js';
import { notFoundHandler } from './shared/middlewares/errorHandler.js';
import { apiLimiter } from './shared/middlewares/rateLimiter.js';

// Feature Routes
import authRoutes from './features/auth/auth.routes.js';
import userRoutes from './features/users/users.routes.js';
import postRoutes from './features/posts/posts.routes.js';
import commentRoutes from './features/comments/comments.routes.js';
import storyRoutes from './features/stories/stories.routes.js';
import reelRoutes from './features/reels/reels.routes.js';
import messageRoutes from './features/messages/messages.routes.js';
import notificationRoutes from './features/notifications/notifications.routes.js';
import searchRoutes from './features/search/search.routes.js';
import adminRoutes from './features/admin/admin.routes.js';
import groupRoutes from './features/groups/groups.routes.js';

const app = express();

// ────────────────────────────────────────────────────────
// Global Middleware
// ────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(mongoSanitize()); // Prevent NoSQL injection

if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ────────────────────────────────────────────────────────
// Health Check
// ────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: '🚀 Nova API is up and running',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// ────────────────────────────────────────────────────────
// API Routes — v1
// ────────────────────────────────────────────────────────
const API_PREFIX = '/api/v1';

// Global API rate limiter — applies to all /api/v1/* routes
app.use(API_PREFIX, apiLimiter);

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/posts`, postRoutes);
// Nested: /api/v1/posts/:postId/comments
app.use(`${API_PREFIX}/posts/:postId/comments`, commentRoutes);
// Standalone: /api/v1/comments/:id (for edit/delete/react)
app.use(`${API_PREFIX}/comments`, commentRoutes);
app.use(`${API_PREFIX}/stories`, storyRoutes);
app.use(`${API_PREFIX}/reels`, reelRoutes);
app.use(`${API_PREFIX}/messages`, messageRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
app.use(`${API_PREFIX}/search`, searchRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/groups`, groupRoutes);

// ────────────────────────────────────────────────────────
// Root Route (Prevents 404 when visiting backend directly)
// ────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the Nova API. The frontend is running on ' + env.CLIENT_URL,
  });
});

// ────────────────────────────────────────────────────────
// Error Handling (must be last)
// ────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
