import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Ban, UserCheck, ShieldAlert, Users, Globe, Lock, X } from 'lucide-react';
import api from '@/shared/api/axios.instance.js';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import Avatar from '@/shared/components/Avatar.jsx';
import Button from '@/shared/components/Button.jsx';
import { Skeleton } from '@/shared/components/Skeleton.jsx';
import { toast } from '@/shared/hooks/useToast.js';
import { formatRelativeTime, formatCount } from '@/shared/utils/formatters.js';
import { cn } from '@/shared/utils/cn.js';

function BanGroupModal({ group, onClose, onConfirm, isPending }) {
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({ isBanned: true, banReason: reason });
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
            <Ban className="h-5 w-5 text-red-500" /> Suspend Group
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-slate-400">
            Suspending <span className="text-white font-semibold">{group.name}</span> will hide it from search engines, feeds, recommendations, and prevent regular users from accessing its pages.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">Suspension Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the reason (e.g. Inappropriate content, violating terms)..."
              required
              className="w-full min-h-[90px] p-3 rounded-xl border border-white/10 bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-white/10 text-slate-300">Cancel</Button>
            <Button type="submit" variant="destructive" isLoading={isPending} className="flex-1 bg-red-600 hover:bg-red-700">
              Confirm Suspend
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function AdminGroupsPage() {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'admin';
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [banTarget, setBanTarget] = useState(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'groups', search, page],
    queryFn: () => api.get('/admin/groups', {
      params: { search: search || undefined, page, limit: 15 }
    }).then(r => r.data),
    placeholderData: keepPreviousData,
  });

  const groups = data?.data || [];
  const meta = data?.meta;

  const banMutation = useMutation({
    mutationFn: ({ groupId, isBanned, banReason }) => 
      api.patch(`/admin/groups/${groupId}/ban`, { isBanned, banReason }),
    onSuccess: (_, { isBanned }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'groups'] });
      toast.success(isBanned ? 'Group suspended successfully' : 'Group reinstated successfully');
      setBanTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update group status'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Users className="h-6 w-6 text-violet-500" /> Groups
        </h1>
        <p className="text-sm text-slate-500 mt-1">Monitor, inspect, and suspend platform groups/communities</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search groups by name..."
          className="w-full h-10 pl-9 pr-4 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/5 bg-[#13131f] overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_150px_100px_100px_160px_auto] gap-0 text-xs text-slate-500 uppercase tracking-wider px-5 py-3 border-b border-white/5 font-medium">
          <span className="w-10">#</span>
          <span>Group Name</span>
          <span>Creator</span>
          <span className="text-center">Members</span>
          <span className="text-center">Privacy</span>
          <span className="text-center">Status</span>
          <span className="text-right">Actions</span>
        </div>

        <div className="divide-y divide-white/5">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <Skeleton className="h-9 w-9 rounded-full bg-white/5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-36 bg-white/5" />
                    <Skeleton className="h-2.5 w-48 bg-white/5" />
                  </div>
                </div>
              ))
            : groups.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No groups found on the platform.
                </div>
            ) : groups.map((g, idx) => (
                <motion.div
                  key={g._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="grid grid-cols-[auto_1fr_150px_100px_100px_160px_auto] items-center gap-0 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                >
                  <span className="w-10 text-xs text-slate-600">{(page - 1) * 15 + idx + 1}</span>
                  
                  {/* Group Identity */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={g.avatar} name={g.name} size="sm" isGroup />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{g.name}</p>
                      <p className="text-xs text-slate-500 truncate" title={g.description}>{g.category} · {g.description || 'No description'}</p>
                    </div>
                  </div>

                  {/* Creator */}
                  <div className="text-xs text-slate-300 truncate pr-2">
                    {g.creator ? (
                      <span className="flex items-center gap-1.5">
                        <Avatar src={g.creator.avatar} name={g.creator.name} size="xs" />
                        <span className="truncate">@{g.creator.username}</span>
                      </span>
                    ) : (
                      <span className="text-slate-600">Unknown</span>
                    )}
                  </div>

                  {/* Member count */}
                  <div className="text-center text-xs text-slate-300 font-semibold">
                    {formatCount(g.memberCount)}
                  </div>

                  {/* Privacy */}
                  <div className="flex justify-center text-slate-400">
                    {g.privacy === 'public' ? (
                      <span className="flex items-center gap-1 text-xs" title="Public">
                        <Globe className="h-3.5 w-3.5 text-blue-400" /> Public
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs" title="Private">
                        <Lock className="h-3.5 w-3.5 text-amber-500" /> Private
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex justify-center">
                    {g.isBanned ? (
                      <div className="flex flex-col items-center" title={g.banReason}>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 font-semibold flex items-center gap-1">
                          <Ban className="h-2.5 w-2.5" /> Suspended
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-medium">Active</span>
                    )}
                  </div>

                  {/* Actions (Ban/Unban) */}
                  <div className="flex items-center justify-end gap-2">
                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (g.isBanned) {
                            banMutation.mutate({ groupId: g._id, isBanned: false });
                          } else {
                            setBanTarget(g);
                          }
                        }}
                        disabled={banMutation.isPending}
                        title={g.isBanned ? 'Reinstate Group' : 'Suspend Group'}
                        className={cn(
                          'p-1.5 rounded-lg transition-colors duration-200 disabled:opacity-40',
                          g.isBanned
                            ? 'text-emerald-400 hover:bg-emerald-500/10'
                            : 'text-red-400 hover:bg-red-500/10'
                        )}
                      >
                        {g.isBanned ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </motion.div>
            ))
          }
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/5">
            <p className="text-xs text-slate-500">
              {meta.total} groups · Page {meta.page} of {meta.totalPages}
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

      {/* Ban group modal */}
      <AnimatePresence>
        {banTarget && (
          <BanGroupModal
            group={banTarget}
            onClose={() => setBanTarget(null)}
            onConfirm={(params) => banMutation.mutate({ groupId: banTarget._id, ...params })}
            isPending={banMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
