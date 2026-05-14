// [auto] Post card with like/comment
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
  Globe, Users, Lock, Edit2, Trash2, Flag,
  ThumbsUp
} from 'lucide-react';
import Avatar from '@/shared/components/Avatar.jsx';
import { cn } from '@/shared/utils/cn.js';
import { formatRelativeTime, formatCount } from '@/shared/utils/formatters.js';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import api from '@/shared/api/axios.instance.js';
import { toast } from '@/shared/hooks/useToast.js';
import CommentSection from './CommentSection.jsx';
import SharePostModal from './SharePostModal.jsx';
import EditPostModal from './EditPostModal.jsx';
import PostMedia from '@/shared/components/PostMedia.jsx';

const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like', color: 'text-blue-500' },
  { type: 'love', emoji: '❤️', label: 'Love', color: 'text-red-500' },
  { type: 'haha', emoji: '😂', label: 'Haha', color: 'text-amber-500' },
  { type: 'wow', emoji: '😮', label: 'Wow', color: 'text-amber-500' },
  { type: 'sad', emoji: '😢', label: 'Sad', color: 'text-blue-400' },
  { type: 'angry', emoji: '😠', label: 'Angry', color: 'text-red-600' },
];

import ReactionListModal from './ReactionListModal.jsx';

const VISIBILITY_ICONS = { public: Globe, friends: Users, private: Lock };

function ReactionPicker({ onReact, onClose }) {
  const [hoveredType, setHoveredType] = useState(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 15, scale: 0.95 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="absolute bottom-full left-0 mb-3 flex gap-2.5 rounded-full border border-white/20 dark:border-white/10 bg-card/90 backdrop-blur-2xl px-4 py-2.5 shadow-2xl shadow-primary/20 z-30"
      role="toolbar"
      aria-label="Reaction picker"
    >
      {REACTIONS.map(({ type, emoji, label }) => (
        <div key={type} className="relative flex flex-col items-center">
          {/* Hover Tooltip Label */}
          <AnimatePresence>
            {hoveredType === type && (
              <motion.span
                initial={{ opacity: 0, y: 4, scale: 0.9 }}
                animate={{ opacity: 1, y: -24, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.9 }}
                transition={{ duration: 0.12 }}
                className="absolute text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md whitespace-nowrap pointer-events-none z-40 select-none"
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>

          <motion.button
            type="button"
            onClick={() => { onReact(type); onClose(); }}
            onMouseEnter={() => setHoveredType(type)}
            onMouseLeave={() => setHoveredType(null)}
            whileHover={{ scale: 1.4, y: -6 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="text-2xl leading-none filter drop-shadow-sm select-none cursor-pointer focus:outline-none"
            aria-label={label}
          >
            {emoji}
          </motion.button>
        </div>
      ))}
    </motion.div>
  );
}

function SharedPostPreview({ sharedPost, sharedModel }) {
  if (!sharedPost) return null;

  const isReel = sharedModel === 'Reel';
  const author = sharedPost.author;
  const content = isReel ? sharedPost.caption : sharedPost.content;
  const media = isReel
    ? (sharedPost.video?.url ? [{ url: sharedPost.video.url, type: 'video' }] : [])
    : (sharedPost.media || []);

  return (
    <div className="mt-3 rounded-2xl border border-border/60 bg-muted/30 p-3.5 space-y-2.5 backdrop-blur-sm">
      {/* Author row */}
      <div className="flex items-center gap-2">
        <Link to={`/${author?.username || ''}`} onClick={(e) => e.stopPropagation()}>
          <Avatar src={author?.avatar} name={author?.name} size="xs" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              to={`/${author?.username || ''}`}
              onClick={(e) => e.stopPropagation()}
              className="font-bold text-xs text-foreground hover:underline truncate"
            >
              {author?.name || 'Deleted User'}
            </Link>
            {sharedModel === 'GroupPost' && sharedPost.group && (
              <>
                <span className="text-[10px] text-muted-foreground">in</span>
                <Link
                  to={`/groups/${sharedPost.group._id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-bold text-xs text-primary hover:underline truncate"
                >
                  {sharedPost.group.name}
                </Link>
              </>
            )}
            {author?.username && sharedModel !== 'GroupPost' && (
              <span className="text-[10px] text-muted-foreground truncate">@{author.username}</span>
            )}
          </div>
          <div className="text-[9px] text-muted-foreground font-medium">
            {sharedPost.createdAt ? formatRelativeTime(sharedPost.createdAt) : ''}
            {isReel && <span className="ml-1 text-primary font-bold">· Reel</span>}
          </div>
        </div>
      </div>

      {/* Content */}
      {content && (
        <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
          {content.split(/(#\w+|@\w+)/g).map((part, i) => {
            if (part.startsWith('#')) {
              return (
                <Link
                  key={i}
                  to={`/hashtag/${part.slice(1)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-primary hover:underline font-bold"
                >
                  {part}
                </Link>
              );
            }
            if (part.startsWith('@')) {
              return (
                <Link
                  key={i}
                  to={`/${part.slice(1)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-secondary hover:underline font-bold"
                >
                  {part}
                </Link>
              );
            }
            return part;
          })}
        </p>
      )}

      {/* Media */}
      {media.length > 0 && (
        <div className="overflow-hidden rounded-xl mt-1" onClick={(e) => e.stopPropagation()}>
          <PostMedia media={media} />
        </div>
      )}
    </div>
  );
}

export default function PostCard({ post, defaultShowComments = false }) {
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showReactionList, setShowReactionList] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(defaultShowComments);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userReaction, setUserReaction] = useState(post.userReaction);
  
  const hoverTimeoutRef = useRef(null);
  const leaveTimeoutRef = useRef(null);
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

  const handleMouseEnter = () => {
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    if (!showReactionPicker) {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => {
        setShowReactionPicker(true);
      }, 200);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    leaveTimeoutRef.current = setTimeout(() => {
      setShowReactionPicker(false);
    }, 300);
  };
  const [reactionCount, setReactionCount] = useState(post.totalReactions || 0);
  const [isSaved, setIsSaved] = useState(post.isSaved || false);

  const isOwner = currentUser?._id === post.author?._id;
  const VisibilityIcon = VISIBILITY_ICONS[post.visibility] || Globe;

  // Reaction mutation
  const reactMutation = useMutation({
    mutationFn: (type) =>
      post.group
        ? api.post(`/groups/${post.group._id}/posts/${post._id}/react`, { type })
        : api.post(`/posts/${post._id}/react`, { type }),
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
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      if (post.group) {
        queryClient.invalidateQueries({ queryKey: ['group-posts', post.group._id] });
      } else if (post.author?.username) {
        queryClient.invalidateQueries({ queryKey: ['userPosts', post.author.username] });
      }
    }
  });

  const saveMutation = useMutation({
    mutationFn: () => api.post(`/posts/${post._id}/save`),
    onMutate: () => setIsSaved((v) => !v),
    onSuccess: (res) => {
      const saved = res.data.data.saved;
      setIsSaved(saved);
      toast.success(saved ? 'Post saved!' : 'Post unsaved');
      queryClient.invalidateQueries({ queryKey: ['savedPosts'] });
    },
    onError: () => setIsSaved((v) => !v),
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      post.group
        ? api.delete(`/groups/${post.group._id}/posts/${post._id}`)
        : api.delete(`/posts/${post._id}`),
    onMutate: () => {
      const toastId = toast.loading('Deleting post...');
      return { toastId };
    },
    onSuccess: (data, variables, context) => {
      toast.success('Post deleted', { id: context?.toastId });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      if (post.group) {
        queryClient.invalidateQueries({ queryKey: ['group-posts', post.group._id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['userPosts', post.author?.username] });
      }
    },
    onError: (err, variables, context) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete post', { id: context?.toastId });
    },
  });

  const currentReactionEmoji = REACTIONS.find((r) => r.type === userReaction)?.emoji;

  return (
    <>
      <motion.article
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-3xl glass-card p-4.5 mb-4 shadow-sm hover:shadow-md transition-all duration-300 border border-border/60"
        aria-label={`Post by ${post.author?.name}`}
      >
        {/* Author row */}
        <div className="flex items-start gap-3 mb-3">
          <Link to={`/${post.author?.username}`}>
            <Avatar
              src={post.author?.avatar}
              name={post.author?.name}
              size="md"
              isOnline={post.author?.isOnline}
              showRing={!!post.author?.hasStory}
            />
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                to={`/${post.author?.username}`}
                className="font-bold text-sm text-foreground hover:text-primary transition-colors"
              >
                {post.author?.name}
              </Link>
              {post.mentions && post.mentions.length > 0 && (
                <span className="text-xs text-muted-foreground font-medium">
                  {' '}with{' '}
                  {post.mentions.map((u, idx) => (
                    <span key={u._id || idx}>
                      <Link
                        to={`/${u.username}`}
                        className="font-bold text-foreground hover:text-primary hover:underline transition-colors"
                      >
                        {u.name}
                      </Link>
                      {idx < post.mentions.length - 1 && (
                        <span>
                          {idx === post.mentions.length - 2 ? ' and ' : ', '}
                        </span>
                      )}
                    </span>
                  ))}
                </span>
              )}
              {post.group && (
                <>
                  <span className="text-xs text-muted-foreground font-medium">in</span>
                  <Link
                    to={`/groups/${post.group._id}`}
                    className="font-bold text-sm text-primary hover:underline truncate"
                  >
                    {post.group.name}
                  </Link>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 font-medium">
              <span>{formatRelativeTime(post.createdAt)}</span>
              {!post.group && (
                <>
                  <span>·</span>
                  <VisibilityIcon className="h-3 w-3" aria-label={`Visibility: ${post.visibility}`} />
                </>
              )}
              {post.isSponsored && (
                <>
                  <span>·</span>
                  <span className="font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded-full text-[10px]">Sponsored</span>
                </>
              )}
            </div>
          </div>

          {/* Post menu */}
          <div className="relative">
            <button
              ref={btnRef}
              onClick={() => setShowMenu((v) => !v)}
              className="h-8.5 w-8.5 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-colors cursor-pointer"
              aria-label="Post options"
              aria-expanded={showMenu}
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
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 z-30 w-44 rounded-2xl border border-white/20 dark:border-white/10 bg-card/95 backdrop-blur-2xl shadow-xl py-1.5 overflow-hidden"
                >
                  {isOwner ? (
                    <>
                      {!post.group && (
                        <button
                          onClick={() => { setShowEditModal(true); setShowMenu(false); }}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm font-medium text-foreground hover:bg-accent/80 transition-colors cursor-pointer"
                        >
                          <Edit2 className="h-4 w-4 text-muted-foreground" />
                          Edit post
                        </button>
                      )}
                      <button
                        onClick={() => { deleteMutation.mutate(); setShowMenu(false); }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete post
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        if (post.group) {
                          api.post(`/groups/${post.group._id}/reports`, {
                            targetType: 'post',
                            targetId: post._id,
                            reason: 'spam',
                            description: 'Reported from home feed',
                          });
                        } else {
                          api.post(`/posts/${post._id}/report`, { reason: 'spam' });
                        }
                        toast.info('Post reported. Thank you!');
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm font-medium text-foreground hover:bg-accent/80 transition-colors cursor-pointer"
                    >
                      <Flag className="h-4 w-4 text-muted-foreground" />
                      Report post
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Shared post indicator */}
        {post.sharedPost && (
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Share2 className="h-3.5 w-3.5 text-primary" />
            {post.sharedModel === 'Reel' 
              ? 'Shared a reel' 
              : post.sharedModel === 'GroupPost' 
              ? 'Shared a group post' 
              : 'Shared a post'}
          </p>
        )}

        {/* Content */}
        {post.content && (
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-normal">
            {post.content.split(/(#\w+|@\w+)/g).map((part, i) => {
              if (part.startsWith('#')) {
                return <Link key={i} to={`/hashtag/${part.slice(1)}`} className="text-primary hover:underline font-semibold">{part}</Link>;
              }
              if (part.startsWith('@')) {
                return <Link key={i} to={`/${part.slice(1)}`} className="text-secondary hover:underline font-semibold">{part}</Link>;
              }
              return part;
            })}
          </p>
        )}

        {/* Media */}
        <PostMedia media={post.media} />

        {/* Shared Post Preview */}
        {post.sharedPost && (
          <SharedPostPreview sharedPost={post.sharedPost} sharedModel={post.sharedModel} />
        )}

        {/* Reaction count summary */}
        {(reactionCount > 0 || post.commentCount > 0) && (
          <div className="flex items-center gap-1.5 mt-3.5 pb-3 border-b border-border/50">
            {reactionCount > 0 && (
              <button 
                onClick={() => setShowReactionList(true)}
                className="flex items-center gap-1.5 hover:bg-accent/80 px-2 py-1 -ml-1 rounded-xl transition-colors group cursor-pointer"
              >
                <div className="flex -space-x-1.5">
                  {Object.entries(post.reactionCounts || {})
                    .filter(([, count]) => count > 0)
                    .slice(0, 3)
                    .map(([type]) => {
                      const r = REACTIONS.find((r) => r.type === type);
                      return r ? <span key={type} className="text-base leading-none relative shadow-xs rounded-full bg-background ring-2 ring-card">{r.emoji}</span> : null;
                    })}
                </div>
                <span className="text-xs text-muted-foreground font-semibold group-hover:text-foreground">
                  {formatCount(reactionCount)} {reactionCount === 1 ? 'reaction' : 'reactions'}
                </span>
              </button>
            )}
            {post.commentCount > 0 && (
              <>
                <span className="text-muted-foreground/60">·</span>
                <button
                  onClick={() => setShowComments((v) => !v)}
                  className="text-xs text-muted-foreground font-semibold hover:text-primary transition-colors cursor-pointer"
                >
                  {formatCount(post.commentCount)} comments
                </button>
              </>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 mt-2.5">
          {/* React button with picker */}
          <div 
            className="relative flex-1"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              onClick={() => reactMutation.mutate(userReaction ? userReaction : 'like')}
              className={cn(
                'flex w-full items-center justify-center gap-1.5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer',
                userReaction
                  ? 'text-primary bg-primary/15 hover:bg-primary/20 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/80'
              )}
              aria-label={userReaction ? `Reacted with ${userReaction}` : 'React to post'}
            >
              {userReaction ? (
                <span className="text-base leading-none">{currentReactionEmoji}</span>
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

          {/* Comment button */}
          <button
            onClick={() => setShowComments((v) => !v)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer',
              showComments
                ? 'text-primary bg-primary/15 shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/80'
            )}
            aria-label="Comment on post"
            aria-expanded={showComments}
          >
            <MessageCircle className="h-4 w-4" />
            <span>Comment</span>
          </button>

          {/* Share button */}
          <button
            onClick={() => setShowShareModal(true)}
            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 rounded-2xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-all duration-200 cursor-pointer"
            aria-label="Share post"
          >
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </button>

          {/* Save button */}
          {!post.group && (
            <button
              onClick={() => saveMutation.mutate()}
              className={cn(
                'flex items-center justify-center h-10 w-10 rounded-2xl transition-all duration-200 cursor-pointer',
                isSaved
                  ? 'text-primary bg-primary/15 shadow-xs'
                  : 'text-muted-foreground hover:text-primary hover:bg-accent/80'
              )}
              aria-label={isSaved ? 'Unsave post' : 'Save post'}
            >
              <Bookmark className={cn('h-4 w-4', isSaved && 'fill-current')} />
            </button>
          )}
        </div>

        {/* Comment Section */}
        <AnimatePresence>
          {showComments && (
            <CommentSection postId={post._id} commentCount={post.commentCount} />
          )}
        </AnimatePresence>
      </motion.article>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <SharePostModal post={post} onClose={() => setShowShareModal(false)} />
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <EditPostModal post={post} onClose={() => setShowEditModal(false)} />
        )}
      </AnimatePresence>
      
      {/* Reaction List Modal */}
      <AnimatePresence>
        {showReactionList && (
          <ReactionListModal postId={post._id} onClose={() => setShowReactionList(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

