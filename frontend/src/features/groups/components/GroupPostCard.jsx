import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MessageCircle, MoreHorizontal, Globe, Trash2, Pin, ShieldAlert, ThumbsUp, Share2
} from 'lucide-react';
import Avatar from '@/shared/components/Avatar.jsx';
import { cn } from '@/shared/utils/cn.js';
import { formatRelativeTime, formatCount } from '@/shared/utils/formatters.js';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import api from '@/shared/api/axios.instance.js';
import { toast } from '@/shared/hooks/useToast.js';
import CommentSection from '@/features/posts/components/CommentSection.jsx';
import SharePostModal from '@/features/posts/components/SharePostModal.jsx';
import PostMedia from '@/shared/components/PostMedia.jsx';

const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'haha', emoji: '😂', label: 'Haha' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
  { type: 'sad', emoji: '😢', label: 'Sad' },
  { type: 'angry', emoji: '😠', label: 'Angry' },
];

function ReactionPicker({ onReact, onClose }) {
  const [hoveredType, setHoveredType] = useState(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 15, scale: 0.95 }}
      className="absolute bottom-full left-0 mb-3 flex gap-2 rounded-full border border-border/50 bg-card/90 backdrop-blur-md px-3 py-2 shadow-xl z-30"
    >
      {REACTIONS.map(({ type, emoji, label }) => (
        <motion.button
          key={type}
          type="button"
          onClick={() => { onReact(type); onClose(); }}
          whileHover={{ scale: 1.3, y: -4 }}
          className="text-xl filter drop-shadow-sm select-none cursor-pointer focus:outline-none"
          title={label}
        >
          {emoji}
        </motion.button>
      ))}
    </motion.div>
  );
}

export default function GroupPostCard({ post, groupId, myRole }) {
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();

  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [userReaction, setUserReaction] = useState(post.userReaction);
  const [reactionCount, setReactionCount] = useState(post.totalReactions || 0);
  const [showShareModal, setShowShareModal] = useState(false);

  const isAuthor = currentUser?._id === post.author?._id;
  const isModOrAbove = myRole && ['owner', 'admin', 'moderator'].includes(myRole);
  const canDelete = isAuthor || isModOrAbove;

  const menuRef = useRef(null);
  const btnRef = useRef(null);

  // Click outside to close options menu
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => {
      if (!menuRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  // React mutation
  const reactMutation = useMutation({
    mutationFn: (type) => api.post(`/groups/${groupId}/posts/${post._id}/react`, { type }),
    onMutate: (type) => {
      if (userReaction === type) {
        setUserReaction(null);
        setReactionCount((c) => Math.max(0, c - 1));
      } else {
        if (!userReaction) setReactionCount((c) => c + 1);
        setUserReaction(type);
      }
    },
    onError: () => {
      setUserReaction(post.userReaction);
      setReactionCount(post.totalReactions);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/groups/${groupId}/posts/${post._id}`),
    onMutate: () => {
      const toastId = toast.loading('Deleting post...');
      return { toastId };
    },
    onSuccess: (data, variables, context) => {
      toast.success('Post deleted', { id: context?.toastId });
      queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-pending-posts', groupId] });
    },
    onError: (err, variables, context) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete post', { id: context?.toastId });
    },
  });

  // Pin mutation
  const pinMutation = useMutation({
    mutationFn: () => api.post(`/groups/${groupId}/posts/${post._id}/pin`),
    onSuccess: () => {
      toast.success(post.isPinned ? 'Post unpinned' : 'Post pinned');
      queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
    },
  });

  const currentReactionEmoji = REACTIONS.find((r) => r.type === userReaction)?.emoji;

  return (
    <motion.article
      layout
      className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3"
    >
      {/* Header */}
      <div className="flex items-start gap-3 justify-between">
        <div className="flex items-center gap-3">
          <Avatar src={post.author?.avatar} name={post.author?.name} size="sm" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-foreground">{post.author?.name}</span>
              {post.isPinned && (
                <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                  <Pin className="h-3 w-3" /> Pinned
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {formatRelativeTime(post.createdAt)} · @{post.author?.username}
            </p>
          </div>
        </div>

        {/* Options Menu Trigger */}
        <div className="relative">
          <button
            ref={btnRef}
            onClick={() => setShowMenu((v) => !v)}
            className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                className="absolute right-0 top-full mt-1 z-20 w-40 rounded-xl border border-border bg-card shadow-lg py-1 text-left"
              >
                {isModOrAbove && (
                  <button
                    onClick={() => { pinMutation.mutate(); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors"
                  >
                    <Pin className="h-3.5 w-3.5" />
                    {post.isPinned ? 'Unpin Post' : 'Pin Post'}
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => { deleteMutation.mutate(); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors font-semibold"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Post
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      )}

      {/* Media */}
      <PostMedia media={post.media} />

      {/* Stats Summary */}
      {(reactionCount > 0 || post.commentCount > 0) && (
        <div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground border-b border-border/40 pb-2">
          {reactionCount > 0 && (
            <span>{formatCount(reactionCount)} reactions</span>
          )}
          {post.commentCount > 0 && (
            <button onClick={() => setShowComments((v) => !v)} className="hover:text-primary transition-colors">
              {formatCount(post.commentCount)} comments
            </button>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-1 mt-2">
        {/* Like */}
        <div
          className="relative flex-1"
          onMouseEnter={() => setShowReactionPicker(true)}
          onMouseLeave={() => setShowReactionPicker(false)}
        >
          <button
            onClick={() => reactMutation.mutate(userReaction ? userReaction : 'like')}
            className={cn(
              'flex w-full items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors',
              userReaction
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            {userReaction ? (
              <span>{currentReactionEmoji}</span>
            ) : (
              <ThumbsUp className="h-4 w-4" />
            )}
            <span className="capitalize">{userReaction || 'Like'}</span>
          </button>

          <AnimatePresence>
            {showReactionPicker && (
              <ReactionPicker
                onReact={(type) => reactMutation.mutate(type)}
                onClose={() => setShowReactionPicker(false)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Comment */}
        <button
          onClick={() => setShowComments((v) => !v)}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors',
            showComments
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          <MessageCircle className="h-4 w-4" />
          Comment
        </button>

        {/* Share */}
        <button
          onClick={() => setShowShareModal(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </div>

      {/* Comment section drawer */}
      <AnimatePresence>
        {showComments && (
          <CommentSection postId={post._id} commentCount={post.commentCount} />
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <SharePostModal post={post} onClose={() => setShowShareModal(false)} />
        )}
      </AnimatePresence>
    </motion.article>
  );
}
