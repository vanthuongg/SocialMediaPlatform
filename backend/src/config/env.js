import { z } from 'zod';

/**
 * Validates and exposes typed environment variables.
 * Fails fast at startup if required variables are missing.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().url().default('http://localhost:5174'),

  // MongoDB
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Email
  EMAIL_HOST: z.string().default('smtp.gmail.com'),
  EMAIL_PORT: z.coerce.number().default(587),
  EMAIL_USER: z.string().default(''),
  EMAIL_PASS: z.string().default(''),
  EMAIL_FROM: z.string().default('Nova <noreply@nova.social>'),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),

  // Token Expiry
  PASSWORD_RESET_EXPIRES_IN: z.coerce.number().default(15),
  EMAIL_VERIFY_EXPIRES_IN: z.coerce.number().default(24),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parseResult.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parseResult.data;
