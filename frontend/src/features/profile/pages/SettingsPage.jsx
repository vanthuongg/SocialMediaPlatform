import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Lock, Shield, Bell, Moon, Sun, Monitor, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import { useTheme } from '@/shared/hooks/useTheme.js';
import Button from '@/shared/components/Button.jsx';
import Input from '@/shared/components/Input.jsx';
import api from '@/shared/api/axios.instance.js';
import { toast } from '@/shared/hooks/useToast.js';
import { cn } from '@/shared/utils/cn.js';
import Modal from '@/shared/components/Modal.jsx';
import { useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth.js';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const THEMES = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const { logoutMutation } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data) => api.patch('/auth/change-password', data),
    onSuccess: () => { toast.success('Password changed successfully!'); reset(); },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to change password'),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => api.delete('/users/me'),
    onSuccess: () => {
      toast.success('Account deleted successfully');
      setShowDeleteModal(false);
      logoutMutation.mutate();
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to delete account'),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6 relative"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="h-10 w-10 flex items-center justify-center rounded-full border border-border/80 bg-card/60 backdrop-blur-sm text-foreground hover:bg-accent transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
          title="Go back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your account preferences</p>
        </div>
      </div>

      {/* Appearance */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Sun className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Appearance</h2>
        </div>
        <p className="text-sm text-muted-foreground">Choose how Nova looks and feels on your device</p>
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTheme(id)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200',
                theme === id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Security</h2>
        </div>

        <form onSubmit={handleSubmit((d) => changePasswordMutation.mutate(d))} className="space-y-4">
          <Input
            label="Current password"
            type="password"
            id="current-password"
            placeholder="Enter current password"
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />
          <Input
            label="New password"
            type="password"
            id="new-password"
            placeholder="Enter new password"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <div className="flex justify-end">
            <Button type="submit" variant="gradient" size="sm" isLoading={changePasswordMutation.isPending}>
              <Lock className="h-4 w-4" />
              Update password
            </Button>
          </div>
        </form>
      </div>

      {/* Account info */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Account</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Email address</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              user?.isEmailVerified ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600'
            )}>
              {user?.isEmailVerified ? '✓ Verified' : 'Unverified'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Account role</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="text-base font-semibold text-destructive mb-2">Danger Zone</h2>
        <p className="text-sm text-muted-foreground mb-4">Once you delete your account, there is no going back. Please be certain.</p>
        <Button variant="destructive" size="sm" onClick={() => setShowDeleteModal(true)}>
          Delete my account
        </Button>
      </div>

      <Modal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Account"
        description="Are you absolutely sure you want to delete your account?"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. This will permanently delete your account
            and remove your data from our servers.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteAccountMutation.mutate()}
              isLoading={deleteAccountMutation.isPending}
            >
              Delete Account
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
