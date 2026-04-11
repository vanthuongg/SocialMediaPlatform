import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30)
      .regex(/^[a-z0-9_\.]+$/, 'Username can only contain letters, numbers, underscores, and dots')
      .toLowerCase(),
    email: z.string().email('Please provide a valid email address').toLowerCase(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Please provide a valid email address').toLowerCase(),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Please provide a valid email address').toLowerCase(),
  }),
});

export const resetPasswordSchema = z.object({
  params: z.object({
    token: z.string().min(1, 'Reset token is required'),
  }),
  body: z.object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  }),
});

/**
 * Zod validation middleware factory.
 * @param {z.ZodSchema} schema
 */
export function validate(schema) {
  return (req, _res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      // Merge validated/transformed data back to req
      Object.assign(req.body, parsed.body || {});
      Object.assign(req.params, parsed.params || {});
      Object.assign(req.query, parsed.query || {});
      next();
    } catch (error) {
      if (error.name === 'ZodError') {
        const details = error.errors.map((e) => ({
          field: e.path.slice(1).join('.'),
          issue: e.message,
        }));
        return next({
          statusCode: 400,
          errorCode: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details,
          isOperational: true,
        });
      }
      next(error);
    }
  };
}
