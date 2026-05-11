import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '@/shared/components/Button.jsx';
import Input from '@/shared/components/Input.jsx';
import { useAuth } from '@/shared/hooks/useAuth.js';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export default function ForgotPasswordPage() {
  const { forgotPasswordMutation } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Link to="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>

      <div className="mb-8">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl font-extrabold text-foreground mb-2">Reset your password</h1>
        <p className="text-muted-foreground">Enter your email address and we'll send you a reset link.</p>
      </div>

      <form onSubmit={handleSubmit((d) => forgotPasswordMutation.mutate(d))} className="space-y-4" noValidate>
        <Input
          label="Email address"
          type="email"
          id="forgot-email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        {forgotPasswordMutation.isSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"
          >
            ✅ If an account exists for that email, we've sent a reset link. Check your inbox.
          </motion.div>
        )}

        <Button type="submit" className="w-full" size="lg" variant="gradient" isLoading={forgotPasswordMutation.isPending}>
          Send reset link
        </Button>
      </form>
    </motion.div>
  );
}
