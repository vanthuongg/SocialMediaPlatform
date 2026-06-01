import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { UserPlus, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import api from '@/shared/api/axios.instance.js';
import { toast } from '@/shared/hooks/useToast.js';
import Button from '@/shared/components/Button.jsx';
import { cn } from '@/shared/utils/cn.js';

const EMPTY_FORM = { name: '', username: '', email: '', password: '', role: 'user' };

function FormField({ label, id, error, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function AdminSettingsPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/admin/accounts', data),
    onSuccess: (res) => {
      toast.success(`Account @${res.data.data.user.username} created`);
      setForm(EMPTY_FORM);
      setErrors({});
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to create account';
      toast.error(msg);
    },
  });

  const validate = () => {
    const e = {};
    if (!form.name.trim() || form.name.length < 2) e.name = 'Name must be at least 2 chars';
    if (!form.username.trim() || form.username.length < 3) e.username = 'Username must be at least 3 chars';
    if (!/^[a-z0-9_.]+$/.test(form.username)) e.username = 'Lowercase letters, numbers, _ and . only';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Invalid email address';
    if (form.password.length < 8) e.password = 'Password must be at least 8 chars';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const e_ = validate();
    if (Object.keys(e_).length > 0) { setErrors(e_); return; }
    setErrors({});
    createMutation.mutate(form);
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-white">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Admin-only configuration and tools</p>
      </div>

      {/* Admin-only badge */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-violet-500/25 bg-violet-500/10">
        <ShieldAlert className="h-5 w-5 text-violet-400 shrink-0" />
        <p className="text-sm text-violet-300">
          This section is restricted to <span className="font-bold">admin</span> accounts only.
        </p>
      </div>

      {/* Create account */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/5 bg-[#13131f] p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <UserPlus className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Create Account</h2>
            <p className="text-xs text-slate-500">Manually create a new user account</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Full Name" id="create-name" error={errors.name}>
              <input
                id="create-name"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Jane Doe"
                className={cn(
                  'w-full h-10 px-3 rounded-xl border bg-white/5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all',
                  errors.name ? 'border-red-500/50' : 'border-white/10'
                )}
              />
            </FormField>

            <FormField label="Username" id="create-username" error={errors.username}>
              <input
                id="create-username"
                value={form.username}
                onChange={e => set('username', e.target.value.toLowerCase())}
                placeholder="janedoe"
                className={cn(
                  'w-full h-10 px-3 rounded-xl border bg-white/5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all',
                  errors.username ? 'border-red-500/50' : 'border-white/10'
                )}
              />
            </FormField>
          </div>

          <FormField label="Email" id="create-email" error={errors.email}>
            <input
              id="create-email"
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="jane@example.com"
              className={cn(
                'w-full h-10 px-3 rounded-xl border bg-white/5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all',
                errors.email ? 'border-red-500/50' : 'border-white/10'
              )}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Password" id="create-password" error={errors.password}>
              <div className="relative">
                <input
                  id="create-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Min. 8 characters"
                  className={cn(
                    'w-full h-10 px-3 pr-10 rounded-xl border bg-white/5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all',
                    errors.password ? 'border-red-500/50' : 'border-white/10'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>

            <FormField label="Role" id="create-role">
              <select
                id="create-role"
                value={form.role}
                onChange={e => set('role', e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-white/10 bg-[#0d0d1a] text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
              >
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
              </select>
            </FormField>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              isLoading={createMutation.isPending}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-violet-500/25"
            >
              <UserPlus className="h-4 w-4" />
              Create Account
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
