import User from '../users/users.model.js';
import RefreshToken from './auth.model.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateSecureToken,
  hashToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from '../../shared/utils/token.utils.js';
import {
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
} from '../../shared/utils/email.utils.js';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  AppError,
} from '../../shared/errors/index.js';
import { env } from '../../config/env.js';

/**
 * Registers a new user account.
 */
export async function register(userData) {
  const { name, username, email, password } = userData;

  // Check for existing user
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    if (existingUser.email === email) throw new ConflictError('Email is already registered');
    throw new ConflictError('Username is already taken');
  }

  // Generate email verification token
  const { rawToken, hashedToken } = generateSecureToken();
  const emailVerifyExpires = new Date(Date.now() + env.EMAIL_VERIFY_EXPIRES_IN * 60 * 60 * 1000);

  const user = await User.create({
    name,
    username,
    email,
    password,
    emailVerifyToken: hashedToken,
    emailVerifyExpires,
  });

  // Send verification email (non-blocking)
  sendEmailVerificationEmail(email, rawToken).catch((err) =>
    console.error('Failed to send verification email:', err.message)
  );

  return user.toPublicProfile();
}

/**
 * Authenticates a user and issues tokens.
 */
export async function login(credentials, meta = {}) {
  const { email, password } = credentials;

  const user = await User.findOne({ email }).select('+password');
  if (!user) throw new UnauthorizedError('Invalid email or password');

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) throw new UnauthorizedError('Invalid email or password');

  if (user.isBanned) {
    if (user.banExpiresAt && new Date() > new Date(user.banExpiresAt)) {
      user.isBanned = false;
      user.banExpiresAt = null;
      user.banReason = null;
      await user.save();
    } else {
      const isPermanent = !user.banExpiresAt;
      const expiresMsg = user.banExpiresAt
        ? ` until ${new Date(user.banExpiresAt).toLocaleString()}`
        : ' permanently';
      const reasonMsg = user.banReason ? ` Reason: ${user.banReason}` : '';
      const err = new UnauthorizedError(`Your account has been suspended${expiresMsg}.${reasonMsg}`);
      err.details = {
        banReason: user.banReason || null,
        banExpiresAt: user.banExpiresAt || null,
        isPermanent,
      };
      throw err;
    }
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  // Store refresh token
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({
    token: refreshToken,
    userId: user._id,
    expiresAt,
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
  });

  return { accessToken, refreshToken, user: user.toPublicProfile() };
}

/**
 * Refreshes access token using a valid refresh token.
 */
export async function refreshAccessToken(refreshToken) {
  if (!refreshToken) throw new UnauthorizedError('Refresh token not provided');

  const decoded = verifyRefreshToken(refreshToken);

  const storedToken = await RefreshToken.findOne({
    token: refreshToken,
    userId: decoded.userId,
    isRevoked: false,
  });

  if (!storedToken) throw new UnauthorizedError('Invalid or expired refresh token');
  if (storedToken.expiresAt < new Date()) {
    await storedToken.deleteOne();
    throw new UnauthorizedError('Refresh token has expired. Please log in again.');
  }

  const user = await User.findById(decoded.userId);
  if (!user) throw new UnauthorizedError('User account unavailable');
  
  if (user.isBanned) {
    if (user.banExpiresAt && new Date() > new Date(user.banExpiresAt)) {
      user.isBanned = false;
      user.banExpiresAt = null;
      user.banReason = null;
      await user.save();
    } else {
      const isPermanent = !user.banExpiresAt;
      const expiresMsg = user.banExpiresAt
        ? ` until ${new Date(user.banExpiresAt).toLocaleString()}`
        : ' permanently';
      const reasonMsg = user.banReason ? ` Reason: ${user.banReason}` : '';
      const err = new UnauthorizedError(`Your account has been suspended${expiresMsg}.${reasonMsg}`);
      err.details = {
        banReason: user.banReason || null,
        banExpiresAt: user.banExpiresAt || null,
        isPermanent,
      };
      throw err;
    }
  }

  const newAccessToken = generateAccessToken(user._id.toString());
  return { accessToken: newAccessToken };
}

/**
 * Revokes refresh token and clears cookie.
 */
export async function logout(refreshToken) {
  if (refreshToken) {
    await RefreshToken.findOneAndUpdate(
      { token: refreshToken },
      { isRevoked: true }
    );
  }
}

/**
 * Initiates forgot password flow.
 */
export async function forgotPassword(email) {
  const user = await User.findOne({ email });
  // Always respond success to prevent email enumeration
  if (!user) return;

  const { rawToken, hashedToken } = generateSecureToken();
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_EXPIRES_IN * 60 * 1000);

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = expiresAt;
  await user.save({ validateBeforeSave: false });

  sendPasswordResetEmail(email, rawToken).catch((err) =>
    console.error('Failed to send password reset email:', err.message)
  );
}

/**
 * Resets user password via secure token.
 */
export async function resetPassword(rawToken, newPassword) {
  const hashedToken = hashToken(rawToken);

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) throw new AppError('Password reset token is invalid or has expired', 400, 'INVALID_RESET_TOKEN');

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Revoke all existing refresh tokens for security
  await RefreshToken.updateMany({ userId: user._id }, { isRevoked: true });
}

/**
 * Verifies user email address.
 */
export async function verifyEmail(rawToken) {
  const hashedToken = hashToken(rawToken);

  const user = await User.findOne({
    emailVerifyToken: hashedToken,
    emailVerifyExpires: { $gt: Date.now() },
  });

  if (!user) throw new AppError('Email verification link is invalid or has expired', 400, 'INVALID_VERIFY_TOKEN');

  user.isEmailVerified = true;
  user.emailVerifyToken = undefined;
  user.emailVerifyExpires = undefined;
  await user.save({ validateBeforeSave: false });

  return user.toPublicProfile();
}
