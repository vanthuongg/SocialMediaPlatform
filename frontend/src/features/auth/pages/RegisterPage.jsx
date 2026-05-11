// [auto] Registration form
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, AtSign, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '@/shared/components/Button.jsx';
import Input from '@/shared/components/Input.jsx';
import { useAuth } from '@/shared/hooks/useAuth.js';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30)
    .regex(/^[a-z0-9_\.]+$/, 'Only lowercase letters, numbers, underscores, and dots')
    .toLowerCase(),
  email: z.string().email('Please enter a valid email address').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});

export default function RegisterPage() {
  const { registerMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(registerSchema) });

  const onSubmit = (data) => registerMutation.mutate(data);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-3xl glass-card border border-border/80 shadow-2xl p-6 sm:p-10 bg-card/90 backdrop-blur-2xl"
    >
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-black text-foreground mb-2 tracking-tight flex items-center justify-center sm:justify-start gap-2">
          Create account <Sparkles className="h-6 w-6 text-primary animate-pulse" />
        </h1>
        <p className="text-muted-foreground font-medium text-sm">Join millions of people on Nova today</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Full name"
          id="reg-name"
          placeholder="Your full name"
          leftIcon={<User className="h-4.5 w-4.5" />}
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Username"
          id="reg-username"
          placeholder="your_username"
          leftIcon={<AtSign className="h-4.5 w-4.5" />}
          error={errors.username?.message}
          hint="Letters, numbers, underscores, and dots only"
          {...register('username')}
        />

        <Input
          label="Email address"
          type="email"
          id="reg-email"
          placeholder="you@example.com"
          leftIcon={<Mail className="h-4.5 w-4.5" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          id="reg-password"
          placeholder="Create a strong password"
          leftIcon={<Lock className="h-4.5 w-4.5" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="hover:text-foreground transition-colors cursor-pointer p-0.5"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          }
          error={errors.password?.message}
          hint="Min 8 chars, one uppercase, one number"
          {...register('password')}
        />

        <p className="text-xs text-muted-foreground font-medium">
          By creating an account, you agree to our{' '}
          <a href="#" className="text-primary font-bold hover:underline">Terms of Service</a> and{' '}
          <a href="#" className="text-primary font-bold hover:underline">Privacy Policy</a>.
        </p>

        <Button
          type="submit"
          className="w-full mt-2"
          size="lg"
          variant="gradient"
          isLoading={registerMutation.isPending}
        >
          Create my Nova account
        </Button>

        <p className="text-center text-xs font-medium text-muted-foreground pt-2">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-primary hover:text-primary/80 transition-colors">
            Sign in
          </Link>
        </p>
      </form>
    </motion.div>
  );
}

