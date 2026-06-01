import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Trash2, ImageIcon, Heart, MessageCircle } from 'lucide-react';
import api from '@/shared/api/axios.instance.js';
import Avatar from '@/shared/components/Avatar.jsx';
import { Skeleton } from '@/shared/components/Skeleton.jsx';
import { toast } from '@/shared/hooks/useToast.js';
import { formatRelativeTime, formatCount } from '@/shared/utils/formatters.js';
import { cn } from '@/shared/utils/cn.js';
import { useAuthStore } from '@/shared/stores/auth.store.js';

export default function AdminPostsPage() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'admin';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'posts', search, page],
    queryFn: () => api.get('/admin/posts', {
      params: { search: search || undefined, page, limit: 15 }
    }).then(r => r.data),
    placeholderData: keepPreviousData,
  });

  const posts = data?.data || [];
  const meta = data?.meta;

  const deleteMutation = useMutation({
    mutationFn: (postId) => api.delete(`/admin/posts/${postId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'posts'] });
      toast.success('Post removed');
    },
    onError: () => toast.error('Failed to delete post'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Posts</h1>
        <p className="text-sm text-slate-500 mt-1">Browse and moderate all platform posts</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search post content..."
          className="w-full h-10 pl-9 pr-4 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
        />
      </div>

      {/* Posts list */}
      <div className="rounded-2xl border border-white/5 bg-[#13131f] overflow-hidden divide-y divide-white/5">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full bg-white/5" />
                  <Skeleton className="h-3 w-32 bg-white/5" />
                </div>
                <Skeleton className="h-12 w-full bg-white/5" />
              </div>
            ))
          : posts.length === 0
          ? (
            <div className="py-16 text-center">
              <p className="text-slate-500 text-sm">No posts found</p>
            </div>
          )
          : posts.map((post, idx) => (
              <motion.div
                key={post._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
                className="p-5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Author */}
                  <Avatar src={post.author?.avatar} name={post.author?.name} size="sm" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{post.author?.name}</span>
                      <span className="text-xs text-slate-500">@{post.author?.username}</span>
                      <span className="text-xs text-slate-600">·</span>
                      <span className="text-xs text-slate-600">{formatRelativeTime(post.createdAt)}</span>
                    </div>

                    {/* Content */}
                    <p className="text-sm text-slate-300 line-clamp-2 mb-2">{post.content}</p>

                    {/* Media indicator */}
                    {post.images?.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                        <ImageIcon className="h-3.5 w-3.5" />
                        {post.images.length} image{post.images.length > 1 ? 's' : ''}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Heart className="h-3.5 w-3.5 text-pink-500" />
                        {formatCount(post.likesCount || 0)}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MessageCircle className="h-3.5 w-3.5 text-blue-400" />
                        {formatCount(post.commentsCount || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Delete action — admin only; moderators must use Report flow */}
                  {isAdmin && (
                    <button
                      onClick={() => deleteMutation.mutate(post._id)}
                      disabled={deleteMutation.isPending}
                      title="Delete post"
                      className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors duration-200 shrink-0 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))
        }
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {meta.total} posts · Page {meta.page} of {meta.totalPages}
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
  );
}
