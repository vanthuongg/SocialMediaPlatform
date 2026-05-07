import rateLimit from 'express-rate-limit';
import { TooManyRequestsError } from '../errors/index.js';

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new TooManyRequestsError(message)),
  });

/** Strict limiter for auth endpoints (login, register, forgot-password) */
export const authLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  10,
  'Too many authentication attempts. Please try again in 15 minutes.'
);

/** Lenient limiter for silent token refresh — called automatically by the client */
export const refreshTokenLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  60,
  'Too many token refresh attempts. Please log in again.'
);

/** General API rate limiter */
export const apiLimiter = createLimiter(
  60 * 1000, // 1 minute
  100,
  'Too many requests. Please slow down.'
);

/** Upload endpoint limiter */
export const uploadLimiter = createLimiter(
  60 * 60 * 1000, // 1 hour
  50,
  'Upload limit exceeded. Please try again in an hour.'
);
