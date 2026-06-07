import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams } from 'react-router-dom';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '@/shared/components/Button.jsx';
import Input from '@/shared/components/Input.jsx';
import { useAuth } from '@/shared/hooks/useAuth.js';

const schema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});

export default function ResetPasswordPage() {
  const { token } = useParams();
  const { resetPasswordMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="mb-8">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl font-extrabold text-foreground mb-2">Create new password</h1>
        <p className="text-muted-foreground">Your new password must be different from previous ones.</p>
      </div>

      <form onSubmit={handleSubmit((d) => resetPasswordMutation.mutate({ token, password: d.password }))} className="space-y-4" noValidate>
        <div className="relative">
          <Lock className="absolute left-3 top-9 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            label="New password"
            type={showPassword ? 'text' : 'password'}
            id="reset-password"
            className="pl-9 pr-10"
            placeholder="Create a strong password"
            error={errors.password?.message}
            {...register('password')}
          />
          <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-9 text-muted-foreground hover:text-foreground">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <Button type="submit" className="w-full" size="lg" variant="gradient" isLoading={resetPasswordMutation.isPending}>
          Reset password
        </Button>
      </form>
    </motion.div>
  );
}
