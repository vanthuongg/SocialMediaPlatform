// [auto] Login form with validation
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '@/shared/components/Button.jsx';
import Input from '@/shared/components/Input.jsx';
import { useAuth } from '@/shared/hooks/useAuth.js';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const { loginMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const banError = searchParams.get('error');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = (data) => loginMutation.mutate(data);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-3xl glass-card border border-border/80 shadow-2xl p-6 sm:p-10 bg-card/90 backdrop-blur-2xl"
    >
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-black text-foreground mb-2 tracking-tight flex items-center justify-center sm:justify-start gap-2">
          Welcome back <Sparkles className="h-6 w-6 text-primary animate-pulse" />
        </h1>
        <p className="text-muted-foreground font-medium text-sm">Sign in to continue your Nova journey</p>
      </div>

      {banError && (
        <div className="mb-6 p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-200 text-xs flex items-start gap-3 backdrop-blur-md">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-red-100 mb-1">Tài khoản bị khóa</p>
            <p className="leading-relaxed font-medium">{banError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email address"
          type="email"
          id="login-email"
          placeholder="you@example.com"
          leftIcon={<Mail className="h-4.5 w-4.5" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          id="login-password"
          placeholder="Enter your password"
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
          {...register('password')}
        />

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-xs text-primary hover:text-primary/80 transition-colors font-bold"
          >
            Forgot your password?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full mt-2"
          size="lg"
          variant="gradient"
          isLoading={loginMutation.isPending}
        >
          Sign in to Nova
        </Button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-card px-4 text-xs font-bold text-muted-foreground rounded-full">or</span>
          </div>
        </div>

        <p className="text-center text-xs font-medium text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-primary hover:text-primary/80 transition-colors">
            Create one free
          </Link>
        </p>
      </form>
    </motion.div>
  );
}

