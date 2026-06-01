import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert, CheckCircle2, XCircle, Clock,
  AlertTriangle, MessageSquare, FileText, User, ExternalLink, Trash2, Video
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/shared/api/axios.instance.js';
import Avatar from '@/shared/components/Avatar.jsx';
import { Skeleton } from '@/shared/components/Skeleton.jsx';
import { toast } from '@/shared/hooks/useToast.js';
import { formatRelativeTime } from '@/shared/utils/formatters.js';
import { cn } from '@/shared/utils/cn.js';
import { useAuthStore } from '@/shared/stores/auth.store.js';

const TARGET_MODEL_CONFIG = {
  Post:    { icon: FileText,      label: 'Post' },
  Comment: { icon: MessageSquare, label: 'Comment' },
  User:    { icon: User,          label: 'User' },
  Reel:    { icon: Video,         label: 'Reel' },
};

function ReportedContent({ target, targetModel }) {
  if (!target) return (
    <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/10">
      <p className="text-xs text-red-400 font-medium">Reported {targetModel} was deleted or is not available</p>
    </div>
  );
  const cfg = TARGET_MODEL_CONFIG[targetModel] || TARGET_MODEL_CONFIG.Post;
  const Icon = cfg.icon;

  const previewText =
    targetModel === 'User'
      ? `@${target.username}`
      : target.content?.slice(0, 120) || target.caption?.slice(0, 120) || '(no text content)';

  const linkTo =
    targetModel === 'User'
      ? `/${target.username}`
      : targetModel === 'Post'
      ? `/posts/${target._id}`
      : targetModel === 'Reel'
      ? `/reels`
      : null;

  return (
    <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5">
      <Icon className="h-3.5 w-3.5 text-slate-500 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">{cfg.label}</p>
        <p className="text-xs text-slate-300 line-clamp-2">{previewText}</p>
      </div>
      {linkTo && (
        <Link
          to={linkTo}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-500 hover:text-violet-400 transition-colors shrink-0"
          title="View content"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

export default function ModeratorDashboardPage() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'admin';
  const [filter, setFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Fetch accurate platform-wide stats from dashboard endpoint
  const { data: dashboardData } = useQuery({
    queryKey: ['mod', 'dashboard'],
    queryFn: () => api.get('/admin/dashboard').then(r => r.data.data.stats),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['mod', 'reports', filter, typeFilter, page],
    queryFn: () =>
      api.get('/admin/reports', {
        params: {
          status: filter !== 'all' ? filter : undefined,
          page,
          limit: 15,
        },
      }).then(r => r.data),
  });

  const reports = (data?.data || []).filter(r => {
    if (typeFilter !== 'all' && r.targetModel?.toLowerCase() !== typeFilter) return false;
    return true;
  });
  const meta = data?.meta;

  // Stats from the authoritative dashboard API (platform-wide totals)
  const stats = {
    pending: dashboardData?.pendingReports ?? '—',
    resolved: meta?.totalResolved ?? '—',
    dismissed: meta?.totalDismissed ?? '—',
  };

  const reviewMutation = useMutation({
    mutationFn: ({ reportId, action }) => api.patch(`/admin/reports/${reportId}`, { action }),
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: ['mod', 'reports'] });
      toast.success(`Report ${action}`);
    },
    onError: () => toast.error('Failed to update report'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-amber-500" /> Moderator Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">Review queue and moderation logs</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#13131f] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
          <div className="bg-amber-500/10 p-3 rounded-xl text-amber-500"><Clock className="h-6 w-6" /></div>
          <div><p className="text-sm text-slate-400">Pending</p><p className="text-2xl font-bold">{stats.pending}</p></div>
        </div>
        <div className="bg-[#13131f] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
          <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-500"><CheckCircle2 className="h-6 w-6" /></div>
          <div><p className="text-sm text-slate-400">Resolved</p><p className="text-2xl font-bold">{stats.resolved}</p></div>
        </div>
        <div className="bg-[#13131f] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
          <div className="bg-slate-500/10 p-3 rounded-xl text-slate-400"><XCircle className="h-6 w-6" /></div>
          <div><p className="text-sm text-slate-400">Dismissed</p><p className="text-2xl font-bold">{stats.dismissed}</p></div>
        </div>
      </div>

      {/* Queue & Filters */}
      <div className="flex flex-col gap-4 bg-[#13131f] border border-white/5 rounded-2xl p-5">
        <div className="flex justify-between items-center pb-4 border-b border-white/5">
          <h2 className="font-semibold text-lg">Moderation Queue</h2>
          <div className="flex gap-2">
            <select
              className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            >
              <option value="all">All Types</option>
              <option value="post">Posts</option>
              <option value="comment">Comments</option>
              <option value="user">Users</option>
            </select>
            <select
              className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm"
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setPage(1); }}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <Skeleton className="h-24 w-full rounded-xl bg-white/5" />
          ) : reports.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No reports found</div>
          ) : (
            reports.map((report) => (
              <motion.div
                key={report._id}
                layout
                className="border border-white/5 bg-[#13131f] rounded-xl p-4 flex justify-between gap-4"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-1 shrink-0">
                    {report.targetModel === 'Post' ? (
                      <FileText className="text-blue-400 h-5 w-5" />
                    ) : report.targetModel === 'User' ? (
                      <User className="text-red-400 h-5 w-5" />
                    ) : report.targetModel === 'Reel' ? (
                      <Video className="text-pink-400 h-5 w-5" />
                    ) : (
                      <MessageSquare className="text-purple-400 h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold capitalize text-sm">{report.reason}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground capitalize">
                        {report.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Reported by {report.reporter?.name || 'Anonymous'} · {formatRelativeTime(report.createdAt)}
                    </p>
                    {report.description && (
                      <p className="text-xs text-slate-400 bg-white/5 rounded-lg px-3 py-1.5 line-clamp-2 mt-1">
                        "{report.description}"
                      </p>
                    )}
                    <ReportedContent target={report.target} targetModel={report.targetModel} />
                  </div>
                </div>

                {report.status === 'pending' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => reviewMutation.mutate({ reportId: report._id, action: 'resolved' })}
                      disabled={reviewMutation.isPending}
                      className="px-3 py-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                    >
                      Approve Action
                    </button>
                    <button
                      onClick={() => reviewMutation.mutate({ reportId: report._id, action: 'dismissed' })}
                      disabled={reviewMutation.isPending}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-500/10 text-slate-400 rounded-lg hover:bg-slate-500/20 transition-colors disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <p className="text-xs text-slate-500">
              {meta.total} reports · Page {meta.page} of {meta.totalPages}
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
    </div>
  );
}
