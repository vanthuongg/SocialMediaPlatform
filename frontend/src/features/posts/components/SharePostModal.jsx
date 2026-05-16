import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Globe, Users, Lock } from 'lucide-react';
import Avatar from '@/shared/components/Avatar.jsx';
import Button from '@/shared/components/Button.jsx';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import api from '@/shared/api/axios.instance.js';
import { toast } from '@/shared/hooks/useToast.js';
import { cn } from '@/shared/utils/cn.js';

const VISIBILITY_OPTIONS = [
  { value: 'public', icon: Globe, label: 'Public' },
  { value: 'friends', icon: Users, label: 'Friends' },
  { value: 'private', icon: Lock, label: 'Only me' },
];

export default function SharePostModal({ post, onClose }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState('public');

  const isReel = !!post.video;
  const previewContent = isReel ? post.caption : post.content;

  const shareMutation = useMutation({
    mutationFn: () =>
      api.post(`/posts/${post._id}/share`, { content: caption, visibility }),
    onSuccess: () => {
       toast.success('Post shared to your feed! 🔁');
       qc.invalidateQueries({ queryKey: ['feed'] });
       qc.invalidateQueries({ queryKey: ['userPosts'] });
       onClose();
     },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to share'),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 16 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Share Post</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Author + visibility */}
          <div className="flex items-center gap-3">
            <Avatar src={user?.avatar} name={user?.name} size="md" />
            <div>
              <p className="text-sm font-semibold text-foreground">{user?.name}</p>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="text-xs px-2 py-0.5 mt-0.5 rounded-full border border-border bg-muted text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                aria-label="Share visibility"
              >
                {VISIBILITY_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Caption */}
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption... (optional)"
            rows={3}
            className="w-full resize-none bg-transparent text-foreground placeholder:text-muted-foreground text-sm leading-relaxed focus:outline-none"
            aria-label="Share caption"
          />

          {/* Original post preview */}
          <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <Avatar src={post.author?.avatar} name={post.author?.name} size="xs" />
              <span className="text-xs font-semibold text-foreground">{post.author?.name}</span>
              <span className="text-xs text-muted-foreground">@{post.author?.username}</span>
            </div>
            {previewContent && (
              <p className="text-xs text-muted-foreground line-clamp-2">{previewContent}</p>
            )}
            {isReel && post.video?.url && (
              <div className="relative w-full h-24 rounded-lg overflow-hidden bg-black">
                <video
                  src={post.video.url}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
                <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                  <span className="text-[10px] bg-black/60 text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">Reel</span>
                </div>
              </div>
            )}
            {!isReel && post.media?.[0] && (
              post.media[0].type === 'video' ? (
                <div className="relative w-full h-24 rounded-lg overflow-hidden bg-black">
                  <video
                    src={post.media[0].url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                  <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                    <span className="text-[10px] bg-black/60 text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">Video</span>
                  </div>
                </div>
              ) : (
                <img
                  src={post.media[0].url}
                  alt="Post preview"
                  className="w-full h-24 object-cover rounded-lg"
                />
              )
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="gradient"
            size="sm"
            onClick={() => shareMutation.mutate()}
            isLoading={shareMutation.isPending}
          >
            <Send className="h-3.5 w-3.5" />
            Share now
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
