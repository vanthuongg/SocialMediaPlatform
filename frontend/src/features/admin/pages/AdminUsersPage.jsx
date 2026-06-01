import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Ban, UserCheck, ShieldCheck, ShieldOff,
  Trash2, ChevronDown, Filter, X, AlertTriangle, AlertCircle, Clock
} from 'lucide-react';
import api from '@/shared/api/axios.instance.js';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import Avatar from '@/shared/components/Avatar.jsx';
import Button from '@/shared/components/Button.jsx';
import { Skeleton } from '@/shared/components/Skeleton.jsx';
import { toast } from '@/shared/hooks/useToast.js';
import { formatRelativeTime } from '@/shared/utils/formatters.js';
import { cn } from '@/shared/utils/cn.js';

const ROLES = ['', 'user', 'moderator', 'admin'];
const ROLE_COLORS = {
  admin:     'bg-violet-500/20 text-violet-400 border-violet-500/30',
  moderator: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  user:      'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

function RoleBadge({ role }) {
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium capitalize', ROLE_COLORS[role] || ROLE_COLORS.user)}>
      {role}
    </span>
  );
}

function RoleSelect({ currentRole, userId, onSuccess }) {
  const [open, setOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: (role) => api.patch(`/admin/users/${userId}/role`, { role }),
    onSuccess: (_, role) => { onSuccess(); toast.success(`Role changed to ${role}`); setOpen(false); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to change role'),
  });

  const roles = ['user', 'moderator'];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 transition-colors duration-200"
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        Role
        <ChevronDown className="h-3 w-3" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 z-50 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[130px]"
          >
            {roles.filter(r => r !== currentRole).map(role => (
              <button
                key={role}
                onClick={() => mutation.mutate(role)}
                disabled={mutation.isPending}
                className="w-full text-left px-4 py-2.5 text-xs capitalize text-slate-300 hover:bg-white/10 transition-colors duration-150 flex items-center gap-2"
              >
                <span className={cn('h-2 w-2 rounded-full',
                  role === 'admin' ? 'bg-violet-500' : role === 'moderator' ? 'bg-blue-500' : 'bg-slate-500'
                )} />
                {role}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DeleteUserModal({ user, onClose, onConfirm, isPending }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-[#13131f] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">Delete User</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-slate-400 mb-2">
          Permanently delete <span className="text-white font-semibold">@{user.username}</span>?
        </p>
        <p className="text-xs text-red-400/80 mb-6">This will also soft-delete all their posts. This action cannot be undone.</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 border-white/10 text-slate-300">Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} isLoading={isPending} className="flex-1">
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function BanUserModal({ user, onClose, onConfirm, isPending }) {
  const [duration, setDuration] = useState('0'); // 0 = permanent
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({ isBanned: true, banReason: reason, durationDays: duration === '0' ? null : duration });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-[#13131f] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Ban className="h-5 w-5 text-amber-500" /> Ban User: @{user.username}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">Ban Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-white/10 bg-[#0d0d1a] text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <option value="0">Permanent / Vĩnh viễn</option>
              <option value="1">1 Day / 1 Ngày</option>
              <option value="3">3 Days / 3 Ngày</option>
              <option value="7">7 Days / 7 Ngày</option>
              <option value="30">30 Days / 30 Ngày</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">Suspension Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide reason for this ban (e.g. Hate speech, Spamming comments)..."
              required
              className="w-full min-h-[90px] p-3 rounded-xl border border-white/10 bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-white/10 text-slate-300">Cancel</Button>
            <Button type="submit" variant="destructive" isLoading={isPending} className="flex-1 bg-red-600 hover:bg-red-700">
              Apply Ban
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function WarnUserModal({ user, onClose, onConfirm, isPending }) {
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-[#13131f] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Send Warning to @{user.username}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">Violation Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe what rule was broken (e.g. Warning for inappropriate media)..."
              required
              className="w-full min-h-[100px] p-3 rounded-xl border border-white/10 bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-white/10 text-slate-300">Cancel</Button>
            <Button type="submit" variant="default" isLoading={isPending} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">
              Send Warning
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function WarningsListModal({ user, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-[#13131f] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]"
      >
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" /> Warning Logs
            </h3>
            <p className="text-xs text-slate-500">History for @{user.username}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {(!user.warnings || user.warnings.length === 0) ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No warnings issued for this account.
            </div>
          ) : (
            user.warnings.map((w, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-white/5 bg-white/5 space-y-1">
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>Issued on {new Date(w.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-slate-300 font-medium">"{w.reason}"</p>
              </div>
            ))
          )}
        </div>
        <div className="pt-4 mt-2 border-t border-white/5">
          <Button onClick={onClose} className="w-full border-white/10 text-slate-300" variant="outline">
            Close
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'admin';
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [bannedFilter, setBannedFilter] = useState('');
  
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [banTarget, setBanTarget] = useState(null);
  const [warnTarget, setWarnTarget] = useState(null);
  const [warningsViewTarget, setWarningsViewTarget] = useState(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', search, roleFilter, bannedFilter, page],
    queryFn: () => api.get('/admin/users', {
      params: { search, role: roleFilter || undefined, isBanned: bannedFilter || undefined, page, limit: 15 }
    }).then(r => r.data),
    placeholderData: keepPreviousData,
  });

  const users = data?.data || [];
  const meta = data?.meta;

  const banMutation = useMutation({
    mutationFn: ({ userId, isBanned, banReason, durationDays }) => 
      api.patch(`/admin/users/${userId}/ban`, { isBanned, banReason, durationDays }),
    onSuccess: (_, { isBanned }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(isBanned ? 'User banned successfully' : 'User unbanned successfully');
      setBanTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update ban status'),
  });

  const warnMutation = useMutation({
    mutationFn: ({ userId, reason }) => api.post(`/admin/users/${userId}/warn`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Warning successfully issued to user');
      setWarnTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to issue warning'),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId) => api.delete(`/admin/users/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User deleted');
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete user'),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'users'] });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Users</h1>
        <p className="text-sm text-slate-500 mt-1">Manage all platform users, suspend accounts and issue warnings</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, username, email..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <select
            value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
            className="h-10 px-3 rounded-xl border border-white/10 bg-[#13131f] text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          >
            <option value="">All roles</option>
            <option value="user">User</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={bannedFilter}
            onChange={e => { setBannedFilter(e.target.value); setPage(1); }}
            className="h-10 px-3 rounded-xl border border-white/10 bg-[#13131f] text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          >
            <option value="">All status</option>
            <option value="false">Active</option>
            <option value="true">Banned</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/5 bg-[#13131f] overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_110px_100px_160px_auto] gap-0 text-xs text-slate-500 uppercase tracking-wider px-5 py-3 border-b border-white/5 font-medium">
          <span className="w-10">#</span>
          <span>User</span>
          <span className="text-center">Role</span>
          <span className="text-center">Warnings</span>
          <span className="text-center">Status</span>
          <span className="text-right">Actions</span>
        </div>

        <div className="divide-y divide-white/5">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <Skeleton className="h-9 w-9 rounded-full bg-white/5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-36 bg-white/5" />
                    <Skeleton className="h-2.5 w-48 bg-white/5" />
                  </div>
                </div>
              ))
            : users.map((u, idx) => {
                const warningCount = u.warnings?.length || 0;
                
                return (
                  <motion.div
                    key={u._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="grid grid-cols-[auto_1fr_110px_100px_160px_auto] items-center gap-0 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="w-10 text-xs text-slate-600">{(page - 1) * 15 + idx + 1}</span>
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={u.avatar} name={u.name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                        <p className="text-xs text-slate-500 truncate">@{u.username} · {u.email}</p>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <RoleBadge role={u.role} />
                    </div>
                    
                    {/* Warnings Badge */}
                    <div className="flex justify-center">
                      <button
                        onClick={() => warningCount > 0 && setWarningsViewTarget(u)}
                        disabled={warningCount === 0}
                        title={warningCount > 0 ? "View warning logs" : "No warnings"}
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full border font-medium transition-all",
                          warningCount > 0 
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20 cursor-pointer"
                            : "bg-slate-500/5 text-slate-600 border-transparent pointer-events-none"
                        )}
                      >
                        {warningCount} warn{warningCount !== 1 && 's'}
                      </button>
                    </div>

                    {/* Status Badge */}
                    <div className="flex justify-center">
                      {u.isBanned ? (
                        <div className="flex flex-col items-center">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 font-semibold">
                            Banned
                          </span>
                          {u.banExpiresAt ? (
                            <span className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-0.5" title={new Date(u.banExpiresAt).toLocaleString()}>
                              <Clock className="h-2.5 w-2.5" /> {new Date(u.banExpiresAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-[8px] text-slate-600 mt-0.5 font-bold uppercase">Permanent</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-medium">Active</span>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      {/* Role change — admin only */}
                      {isAdmin && u._id !== currentUser?._id && (
                        <RoleSelect currentRole={u.role} userId={u._id} onSuccess={invalidate} />
                      )}

                      {/* Issue Warning — admin only */}
                      {isAdmin && u._id !== currentUser?._id && (
                        <button
                          onClick={() => setWarnTarget(u)}
                          title="Issue Warning"
                          className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors duration-200"
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </button>
                      )}

                      {/* Ban/Unban */}
                      {u._id !== currentUser?._id && (
                        <button
                          onClick={() => {
                            if (u.isBanned) {
                              banMutation.mutate({ userId: u._id, isBanned: false });
                            } else {
                              setBanTarget(u);
                            }
                          }}
                          disabled={banMutation.isPending}
                          title={u.isBanned ? 'Unban' : 'Ban'}
                          className={cn(
                            'p-1.5 rounded-lg transition-colors duration-200 disabled:opacity-40',
                            u.isBanned
                              ? 'text-emerald-400 hover:bg-emerald-500/10'
                              : 'text-red-400 hover:bg-red-500/10'
                          )}
                        >
                          {u.isBanned ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                        </button>
                      )}

                      {/* Delete — admin only */}
                      {isAdmin && u._id !== currentUser?._id && (
                        <button
                          onClick={() => setDeleteTarget(u)}
                          title="Delete user"
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })
          }
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/5">
            <p className="text-xs text-slate-500">
              {meta.total} users · Page {meta.page} of {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 disabled:opacity-40 transition-colors"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteUserModal
            user={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
            isPending={deleteMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Ban user modal */}
      <AnimatePresence>
        {banTarget && (
          <BanUserModal
            user={banTarget}
            onClose={() => setBanTarget(null)}
            onConfirm={(params) => banMutation.mutate({ userId: banTarget._id, ...params })}
            isPending={banMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Warn user modal */}
      <AnimatePresence>
        {warnTarget && (
          <WarnUserModal
            user={warnTarget}
            onClose={() => setWarnTarget(null)}
            onConfirm={(reason) => warnMutation.mutate({ userId: warnTarget._id, reason })}
            isPending={warnMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* View warnings log modal */}
      <AnimatePresence>
        {warningsViewTarget && (
          <WarningsListModal
            user={warningsViewTarget}
            onClose={() => setWarningsViewTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
