import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../errors/index.js';
import User from '../../features/users/users.model.js';

/**
 * Verifies JWT access token from Authorization header or cookie.
 * Attaches `req.user` on success.
 */
export async function authenticate(req, _res, next) {
  try {
    let token;

    // 1. Check Authorization header (Bearer <token>)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }

    // 2. Fallback: check cookie
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new UnauthorizedError('No authentication token provided');
    }

    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded.userId)
      .select('-password')
      .lean();

    if (!user) {
      throw new UnauthorizedError('User account no longer exists');
    }

    if (user.isBanned) {
      if (user.banExpiresAt && new Date() > new Date(user.banExpiresAt)) {
        await User.findByIdAndUpdate(user._id, {
          isBanned: false,
          banExpiresAt: null,
          banReason: null,
        });
        user.isBanned = false;
        user.banExpiresAt = null;
        user.banReason = null;
      } else {
        const expiresMsg = user.banExpiresAt 
          ? ` until ${new Date(user.banExpiresAt).toLocaleString()}` 
          : ' permanently';
        const reasonMsg = user.banReason ? ` Reason: ${user.banReason}` : '';
        throw new ForbiddenError(`Your account has been suspended${expiresMsg}.${reasonMsg}`);
      }
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional authentication — attaches req.user if token present, but doesn't block.
 */
export async function optionalAuthenticate(req, _res, next) {
  try {
    let token = req.headers.authorization?.slice(7) || req.cookies?.accessToken;

    if (token) {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.userId).select('-password').lean();
      if (user && !user.isBanned) {
        req.user = user;
      }
    }
  } catch {
    // Silently ignore invalid tokens for optional auth
  }
  next();
}

/**
 * Role-based authorization guard.
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'moderator')
 */
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions for this resource'));
    }
    next();
  };
}
