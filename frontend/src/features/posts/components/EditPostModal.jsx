import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Globe, Users, Lock } from 'lucide-react';
import Button from '@/shared/components/Button.jsx';
import api from '@/shared/api/axios.instance.js';
import { toast } from '@/shared/hooks/useToast.js';

const VISIBILITY_OPTIONS = [
  { value: 'public', icon: Globe, label: 'Public' },
  { value: 'friends', icon: Users, label: 'Friends' },
  { value: 'private', icon: Lock, label: 'Only me' },
];

export default function EditPostModal({ post, onClose }) {
  const qc = useQueryClient();
  const [content, setContent] = useState(post.content || '');
  const [visibility, setVisibility] = useState(post.visibility || 'public');

  const editMutation = useMutation({
    mutationFn: () => api.patch(`/posts/${post._id}`, { content, visibility }),
    onMutate: () => {
      const toastId = toast.loading('Updating post...');
      return { toastId };
    },
    onSuccess: (data, variables, context) => {
      toast.success('Post updated!', { id: context?.toastId });
      qc.invalidateQueries({ queryKey: ['feed'] });
      qc.invalidateQueries({ queryKey: ['userPosts', post.author?.username] });
      onClose();
    },
    onError: (err, variables, context) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update post', { id: context?.toastId });
    },
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
          <h2 className="text-base font-bold text-foreground">Edit Post</h2>
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
          {/* Visibility */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Visible to:</span>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="text-xs px-2 py-1 rounded-full border border-border bg-muted text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              aria-label="Post visibility"
            >
              {VISIBILITY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Content textarea */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={5}
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"
            aria-label="Post content"
          />

          {/* Media preview (read-only, cannot change in edit) */}
          {post.media && post.media.length > 0 && (
            <div className="rounded-xl border border-border bg-muted/40 p-2">
              <p className="text-xs text-muted-foreground mb-2">
                Media cannot be changed after posting
              </p>
              <div className={`grid gap-1 ${post.media.length > 1 ? 'grid-cols-2' : ''}`}>
                {post.media.slice(0, 2).map((item, i) =>
                  item.type === 'video' ? (
                    <video key={i} src={item.url} className="w-full h-20 object-cover rounded-lg" />
                  ) : (
                    <img key={i} src={item.url} alt="" className="w-full h-20 object-cover rounded-lg" />
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="gradient"
            size="sm"
            onClick={() => editMutation.mutate()}
            isLoading={editMutation.isPending}
            disabled={!content.trim() && (!post.media || post.media.length === 0)}
          >
            <Save className="h-3.5 w-3.5" />
            Save changes
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
