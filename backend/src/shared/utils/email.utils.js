import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

// Lazy-initialize transporter to avoid startup failures in dev
let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
      secure: env.EMAIL_PORT === 465,
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Sends an email via Nodemailer.
 * @param {{ to: string, subject: string, html: string }} options
 */
export async function sendEmail({ to, subject, html }) {
  // Skip silently if email credentials not configured (dev environment)
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    console.warn(`[email] Skipped sending "${subject}" to ${to} — EMAIL_USER/EMAIL_PASS not configured.`);
    return;
  }
  const transport = getTransporter();
  await transport.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}

/**
 * Sends a password reset email with a secure link.
 */
export async function sendPasswordResetEmail(to, resetToken) {
  const resetUrl = `${env.CLIENT_URL}/reset-password/${resetToken}`;
  await sendEmail({
    to,
    subject: '🔐 Reset Your Nova Password',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0F0D1A; color: #F0EEFF; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #7C3AED, #6366F1); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Nova</h1>
        </div>
        <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 16px;">Reset Your Password</h2>
        <p style="color: #A89EC4; line-height: 1.6; margin-bottom: 32px;">
          We received a request to reset your Nova password. Click the button below to create a new password. This link expires in ${env.PASSWORD_RESET_EXPIRES_IN} minutes.
        </p>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7C3AED, #6366F1); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #6B5F8A; font-size: 14px; line-height: 1.6;">
          If you didn't request this, you can safely ignore this email. Your password won't change.
        </p>
        <hr style="border: none; border-top: 1px solid #2D2A45; margin: 32px 0;" />
        <p style="color: #4A4560; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} Nova. Connect. Share. Shine.</p>
      </div>
    `,
  });
}

/**
 * Sends an email verification link.
 */
export async function sendEmailVerificationEmail(to, verifyToken) {
  const verifyUrl = `${env.CLIENT_URL}/verify-email/${verifyToken}`;
  await sendEmail({
    to,
    subject: '✅ Verify Your Nova Account',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0F0D1A; color: #F0EEFF; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #7C3AED, #6366F1); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Nova</h1>
        </div>
        <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 16px;">Verify Your Email</h2>
        <p style="color: #A89EC4; line-height: 1.6; margin-bottom: 32px;">
          Welcome to Nova! Click the button below to verify your email address and activate your account. This link expires in ${env.EMAIL_VERIFY_EXPIRES_IN} hours.
        </p>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${verifyUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7C3AED, #6366F1); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px;">
            Verify Email
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #2D2A45; margin: 32px 0;" />
        <p style="color: #4A4560; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} Nova. Connect. Share. Shine.</p>
      </div>
    `,
  });
}
