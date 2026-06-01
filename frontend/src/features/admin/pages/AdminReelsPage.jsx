import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Trash2, Video, Heart, MessageCircle, Play, Eye, X } from 'lucide-react';
import api from '@/shared/api/axios.instance.js';
import Avatar from '@/shared/components/Avatar.jsx';
import { Skeleton } from '@/shared/components/Skeleton.jsx';
import { toast } from '@/shared/hooks/useToast.js';
import { formatRelativeTime, formatCount } from '@/shared/utils/formatters.js';
import { cn } from '@/shared/utils/cn.js';
import { useAuthStore } from '@/shared/stores/auth.store.js';

function VideoPreviewModal({ reel, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-[#0d0d1a] border border-white/10 rounded-2xl overflow-hidden max-w-[240px] w-full shadow-2xl flex flex-col items-center"
      >
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/60 text-slate-300 hover:text-white hover:bg-black/80 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative w-full aspect-[9/16] bg-black">
          <video
            src={reel.video.url}
            className="w-full h-full object-cover"
            controls
            autoPlay
            loop
          />
        </div>

        {/* Reel Details overlay/caption */}
        <div className="w-full p-4 border-t border-white/5 bg-[#131324]/90">
          <div className="flex items-center gap-3 mb-2">
            <Avatar src={reel.author?.avatar} name={reel.author?.name} size="sm" />
            <div>
              <p className="text-xs font-semibold text-white">{reel.author?.name}</p>
              <p className="text-[10px] text-slate-500">@{reel.author?.username}</p>
            </div>
          </div>
          {reel.caption && (
            <p className="text-xs text-slate-300 line-clamp-3 mb-1">{reel.caption}</p>
          )}
          <p className="text-[10px] text-slate-600">{formatRelativeTime(reel.createdAt)}</p>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminReelsPage() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'admin';
  
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [activePreview, setActivePreview] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reels', search, page],
    queryFn: () => api.get('/admin/reels', {
      params: { search: search || undefined, page, limit: 12 }
    }).then(r => r.data),
    placeholderData: keepPreviousData,
  });

  const reels = data?.data || [];
  const meta = data?.meta;

  const deleteMutation = useMutation({
    mutationFn: (reelId) => api.delete(`/admin/reels/${reelId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reels'] });
      toast.success('Reel removed');
    },
    onError: () => toast.error('Failed to delete reel'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Video className="h-6 w-6 text-violet-500" /> Reels
        </h1>
        <p className="text-sm text-slate-500 mt-1">Browse and moderate all user-submitted short videos</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by caption..."
          className="w-full h-10 pl-9 pr-4 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
        />
      </div>

      {/* Reels Grid */}
      {isLoading ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[9/16] rounded-xl bg-white/5 animate-pulse max-w-[120px] w-full mx-auto border-2 border-white/5" />
          ))}
        </div>
      ) : reels.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-white/5 bg-[#13131f]">
          <Video className="h-10 w-10 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No reels found</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
          {reels.map((reel, idx) => (
            <motion.div
              key={reel._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="group relative aspect-[9/16] rounded-xl overflow-hidden border-2 border-white/10 hover:border-violet-500 bg-[#13131f] flex flex-col justify-between max-w-[120px] w-full mx-auto shadow-md transition-all duration-300 hover:scale-105"
            >
              {/* Video Thumbnail / Clickable area */}
              <div className="absolute inset-0 bg-black cursor-pointer" onClick={() => setActivePreview(reel)}>
                {reel.video.thumbnail ? (
                  <img
                    src={reel.video.thumbnail}
                    alt={reel.caption || 'Reel'}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-950">
                    <Video className="h-6 w-6 text-slate-800" />
                  </div>
                )}
              </div>

              {/* Absolute Top-Right delete button (Admin only, visible on hover) */}
              {isAdmin && (
                <div className="absolute top-1.5 right-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(reel._id);
                    }}
                    disabled={deleteMutation.isPending}
                    title="Delete Reel"
                    className="p-1 rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-md transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Center Play Button Overlay (Visible on hover) */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
                <div className="p-2 rounded-full bg-violet-600/90 text-white shadow-lg">
                  <Play className="h-4 w-4 fill-current" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs text-slate-500">
            {meta.total} reels · Page {meta.page} of {meta.totalPages}
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

      {/* Preview Modal */}
      <AnimatePresence>
        {activePreview && (
          <VideoPreviewModal
            reel={activePreview}
            onClose={() => setActivePreview(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
