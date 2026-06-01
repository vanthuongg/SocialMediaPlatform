import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Filter, FileText, MessageSquare, User as UserIcon, ExternalLink, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/shared/api/axios.instance.js';
import Avatar from '@/shared/components/Avatar.jsx';
import { Skeleton } from '@/shared/components/Skeleton.jsx';
import { toast } from '@/shared/hooks/useToast.js';
import { formatRelativeTime } from '@/shared/utils/formatters.js';
import { cn } from '@/shared/utils/cn.js';

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   icon: Clock,         color: 'text-amber-400 bg-amber-500/15 border-amber-500/25' },
  resolved:  { label: 'Resolved',  icon: CheckCircle2,  color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/25' },
  dismissed: { label: 'Dismissed', icon: XCircle,       color: 'text-slate-400 bg-slate-500/15 border-slate-500/25' },
};

const REASON_LABELS = {
  spam:           'Spam',
  harassment:     'Harassment',
  hate_speech:    'Hate Speech',
  misinformation: 'Misinformation',
  nudity:         'Nudity',
  violence:       'Violence',
  other:          'Other',
};

const TARGET_MODEL_CONFIG = {
  Post:    { icon: FileText,      label: 'Post' },
  Comment: { icon: MessageSquare, label: 'Comment' },
  User:    { icon: UserIcon,      label: 'User' },
  Reel:    { icon: Video,         label: 'Reel' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium', cfg.color)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

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

export default function AdminReportsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reports', statusFilter, page],
    queryFn: () => api.get('/admin/reports', {
      params: { status: statusFilter || undefined, page, limit: 15 }
    }).then(r => r.data),
    placeholderData: keepPreviousData,
  });

  const reports = data?.data || [];
  const meta = data?.meta;

  const reviewMutation = useMutation({
    mutationFn: ({ reportId, action }) => api.patch(`/admin/reports/${reportId}`, { action }),
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
      toast.success(`Report ${action}`);
    },
    onError: () => toast.error('Failed to update report'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Reports</h1>
        <p className="text-sm text-slate-500 mt-1">Review and act on user-submitted reports</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-slate-500 shrink-0" />
        {['pending', 'resolved', 'dismissed', ''].map((s, i) => (
          <button
            key={i}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
              statusFilter === s
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
            )}
          >
            {s === '' ? 'All' : STATUS_CONFIG[s]?.label}
          </button>
        ))}
      </div>

      {/* Reports */}
      <div className="rounded-2xl border border-white/5 bg-[#13131f] overflow-hidden divide-y divide-white/5">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-none bg-white/5 m-0" />)
          : reports.length === 0
          ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500/50 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No {statusFilter || ''} reports</p>
              <p className="text-xs text-slate-600 mt-1">All clear!</p>
            </div>
          )
          : reports.map((report, idx) => (
              <motion.div
                key={report._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.04 }}
                className="p-5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <Avatar src={report.reporter?.avatar} name={report.reporter?.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-white">
                          {REASON_LABELS[report.reason] || report.reason}
                        </span>
                        <StatusBadge status={report.status} />
                      </div>
                      <p className="text-xs text-slate-500 mb-1">
                        Reported by <span className="text-slate-400">@{report.reporter?.username}</span>
                        {' · '}{formatRelativeTime(report.createdAt)}
                      </p>
                      {report.description && (
                        <p className="text-xs text-slate-400 bg-white/5 rounded-lg px-3 py-2 line-clamp-2 mt-1">
                          "{report.description}"
                        </p>
                      )}
                      {/* Reported content preview */}
                      <ReportedContent target={report.target} targetModel={report.targetModel} />
                    </div>
                  </div>

                  {/* Actions — only for pending */}
                  {report.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => reviewMutation.mutate({ reportId: report._id, action: 'resolved' })}
                        disabled={reviewMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors duration-200 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Resolve
                      </button>
                      <button
                        onClick={() => reviewMutation.mutate({ reportId: report._id, action: 'dismissed' })}
                        disabled={reviewMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 transition-colors duration-200 disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
        }
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">{meta.total} reports · Page {meta.page} of {meta.totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 disabled:opacity-40 transition-colors">Prev</button>
            <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}
              className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 disabled:opacity-40 transition-colors">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
