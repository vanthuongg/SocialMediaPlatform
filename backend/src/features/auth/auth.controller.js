// [auto] Register & login handlers
import * as authService from './auth.service.js';
import { sendSuccess } from '../../shared/utils/response.utils.js';
import { setRefreshTokenCookie, clearRefreshTokenCookie } from '../../shared/utils/token.utils.js';

export async function register(req, res, next) {
  try {
    const user = await authService.register(req.body);
    sendSuccess(res, {
      data: { user },
      message: 'Account created successfully. Please check your email to verify your account.',
      statusCode: 201,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const meta = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
    const { accessToken, refreshToken, user } = await authService.login(req.body, meta);

    setRefreshTokenCookie(res, refreshToken);

    sendSuccess(res, {
      data: { accessToken, user },
      message: 'Logged in successfully',
    });
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken;
    const { accessToken } = await authService.refreshAccessToken(refreshToken);
    sendSuccess(res, { data: { accessToken } });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken;
    await authService.logout(refreshToken);
    clearRefreshTokenCookie(res);
    sendSuccess(res, { message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    await authService.forgotPassword(req.body.email);
    sendSuccess(res, {
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    await authService.resetPassword(req.params.token, req.body.password);
    sendSuccess(res, { message: 'Password reset successfully. Please log in with your new password.' });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const user = await authService.verifyEmail(req.params.token);
    sendSuccess(res, { data: { user }, message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res) {
  sendSuccess(res, { data: { user: req.user } });
}
