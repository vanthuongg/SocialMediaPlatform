// [auto] Auto-progress and mute control
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2, Send, MessageCircle, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import Avatar from '@/shared/components/Avatar.jsx';
import { StoryRingSkeleton } from '@/shared/components/Skeleton.jsx';
import api from '@/shared/api/axios.instance.js';
import { cn } from '@/shared/utils/cn.js';
import { toast } from '@/shared/hooks/useToast.js';
import CreateStoryModal from './CreateStoryModal.jsx';

// ─── helpers ──────────────────────────────────────────────────────────────────

const EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍', '🔥', '🎉'];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ─── Emoji Picker ──────────────────────────────────────────────────────────────

function EmojiPicker({ storyId, reactions, currentUserId, onReact, paused, setPaused }) {
  const [open, setOpen] = useState(false);
  const myReaction = reactions?.find((r) => r.user === currentUserId || r.user?._id === currentUserId)?.emoji;

  const handleEmoji = (emoji) => {
    onReact(emoji);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
          setPaused((v) => !v);
        }}
        className={cn(
          'h-8 px-3 flex items-center gap-1.5 rounded-full text-sm font-medium transition-all cursor-pointer',
          myReaction
            ? 'bg-white/20 text-white backdrop-blur-md'
            : 'bg-black/40 text-white/90 hover:bg-white/20 backdrop-blur-md'
        )}
        aria-label="React to story"
      >
        {myReaction ? (
          <span className="text-base leading-none">{myReaction}</span>
        ) : (
          <span className="text-base leading-none">😊</span>
        )}
        {reactions?.length > 0 && (
          <span className="text-xs font-bold">{reactions.length}</span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-10 left-0 flex gap-1.5 bg-black/80 backdrop-blur-2xl border border-white/20 rounded-2xl p-2 shadow-2xl z-20"
            onClick={(e) => e.stopPropagation()}
          >
            {EMOJIS.map((em) => (
              <button
                key={em}
                onClick={() => handleEmoji(em)}
                className={cn(
                  'text-2xl leading-none w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/20 transition-all hover:scale-125 cursor-pointer',
                  myReaction === em && 'bg-white/25 scale-110'
                )}
              >
                {em}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Comment Panel ─────────────────────────────────────────────────────────────

function CommentPanel({ storyId, comments, onComment, onDeleteComment, currentUserId, storyAuthorId, setPaused }) {
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const listRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!text.trim()) return;
    onComment(text.trim());
    setText('');
  };

  useEffect(() => {
    if (expanded && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [comments, expanded]);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Comment list — collapsible */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              ref={listRef}
              className="max-h-48 overflow-y-auto bg-black/70 backdrop-blur-xl px-3 pt-2 pb-1 flex flex-col gap-2"
            >
              {comments.length === 0 && (
                <p className="text-white/50 text-xs text-center py-3">No comments yet</p>
              )}
              {comments.map((c) => (
                <div key={c._id} className="flex items-start gap-2 group">
                  <Avatar src={c.author?.avatar} name={c.author?.name} size="xs" />
                  <div className="flex-1 min-w-0">
                    <span className="text-white/90 text-[10px] font-bold mr-1">{c.author?.name}</span>
                    <span className="text-white text-xs break-words">{c.text}</span>
                    <div className="text-white/40 text-[9px] mt-0.5 font-medium">{timeAgo(c.createdAt)}</div>
                  </div>
                  {(c.author?._id === currentUserId || storyAuthorId === currentUserId) && (
                    <button
                      onClick={() => onDeleteComment(c._id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-white/50 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input + toggle */}
      <div className="bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-2 flex items-center gap-2">
        {comments.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-white/60 hover:text-white transition-colors cursor-pointer"
            aria-label="Toggle comments"
          >
            <MessageCircle className="h-4 w-4" />
            {!expanded && (
              <span className="text-[9px] font-bold ml-0.5">{comments.length}</span>
            )}
          </button>
        )}
        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-1.5">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            placeholder="Comment…"
            maxLength={300}
            className="flex-1 bg-white/15 border border-white/20 text-white text-xs rounded-full px-3.5 py-1.5 placeholder:text-white/40 outline-none focus:border-white/50 backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="h-7 w-7 flex items-center justify-center rounded-full bg-nova-gradient disabled:opacity-30 transition-opacity cursor-pointer shadow-md"
            aria-label="Send comment"
          >
            <Send className="h-3.5 w-3.5 text-white" />
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Story Viewer ──────────────────────────────────────────────────────────────

function StoryViewer({ authorGroup, onClose }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const currentStory = authorGroup.stories[currentIndex];

  const videoRef = useRef(null);

  // local mutable copies so we don't need to refetch after every action
  const [localReactions, setLocalReactions] = useState(currentStory.reactions || []);
  const [localComments, setLocalComments] = useState(currentStory.comments || []);

  useEffect(() => {
    setLocalReactions(currentStory.reactions || []);
    setLocalComments(currentStory.comments || []);
  }, [currentIndex]);

  const storyDuration = currentStory.media.type === 'video' && currentStory.media.duration
    ? Math.max(3, Math.ceil(currentStory.media.duration))
    : 5;

  const [progress, setProgress] = useState(0);

  // Sync video element play/pause state
  useEffect(() => {
    if (!videoRef.current) return;
    if (paused) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [paused, currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < authorGroup.stories.length - 1) {
      setCurrentIndex((i) => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, authorGroup.stories.length, onClose]);

  const goPrev = () => {
    setCurrentIndex((i) => Math.max(0, i - 1));
    setProgress(0);
  };

  // Interval-driven stable progress tracking
  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  useEffect(() => {
    if (paused) return;

    const intervalTime = 100;
    const step = (intervalTime / (storyDuration * 1000)) * 100;

    const timer = setInterval(() => {
      setProgress((p) => {
        const next = p + step;
        if (next >= 100) {
          clearInterval(timer);
          goNext();
          return 100;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [currentIndex, storyDuration, paused, goNext]);

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/stories/${currentStory._id}`),
    onMutate: () => {
      const toastId = toast.loading('Deleting story...');
      return { toastId };
    },
    onSuccess: (data, variables, context) => {
      toast.success('Story deleted', { id: context?.toastId });
      qc.invalidateQueries({ queryKey: ['stories'] });
      onClose();
    },
    onError: (err, variables, context) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete story', { id: context?.toastId });
    },
  });

  const reactMutation = useMutation({
    mutationFn: (emoji) => api.post(`/stories/${currentStory._id}/react`, { emoji }),
    onSuccess: (res) => setLocalReactions(res.data.data.reactions || []),
  });

  const commentMutation = useMutation({
    mutationFn: (text) => api.post(`/stories/${currentStory._id}/comments`, { text }),
    onSuccess: (res) => setLocalComments(res.data.data.comments || []),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => api.delete(`/stories/${currentStory._id}/comments/${commentId}`),
    onMutate: () => {
      const toastId = toast.loading('Deleting comment...');
      return { toastId };
    },
    onSuccess: (_, commentId, context) => {
      toast.success('Comment deleted', { id: context?.toastId });
      setLocalComments((prev) => prev.filter((c) => c._id !== commentId));
    },
    onError: (err, variables, context) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete comment', { id: context?.toastId });
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.92 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full h-full sm:h-[90vh] sm:w-auto sm:aspect-[9/16] rounded-none sm:rounded-3xl overflow-hidden bg-black shadow-2xl border-none sm:border sm:border-white/10"
      >
        {/* Progress bars */}
        <div className="absolute top-3 left-3 right-3 z-10 flex gap-1">
          {authorGroup.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
              {i < currentIndex && <div className="h-full w-full bg-white" />}
              {i === currentIndex && (
                <div
                  className="h-full bg-white transition-all duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              )}
              {i > currentIndex && <div className="h-full w-0" />}
            </div>
          ))}
        </div>

        {/* Author info + time ago */}
        <div className="absolute top-8 left-3 z-10 flex items-center gap-2">
          <Avatar src={authorGroup.author.avatar} name={authorGroup.author.name} size="sm" showRing />
          <div>
            <p className="text-white text-xs font-bold">{authorGroup.author.name}</p>
            <p className="text-white/60 text-[10px] font-medium">
              {timeAgo(currentStory.createdAt)} ago · @{authorGroup.author.username}
            </p>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="absolute top-8 right-3 z-10 flex items-center gap-2">
          {currentStory.media.type === 'video' && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
              className="h-7.5 w-7.5 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-all cursor-pointer backdrop-blur-md"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          )}
          {user?._id === authorGroup.author._id && (
            <button
              onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(); }}
              className="h-7.5 w-7.5 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-destructive transition-all cursor-pointer backdrop-blur-md"
              aria-label="Delete story"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="h-7.5 w-7.5 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-all cursor-pointer backdrop-blur-md"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Media */}
        {currentStory.media.type === 'video' ? (
          <video
            ref={videoRef}
            src={currentStory.media.url}
            autoPlay
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <img src={currentStory.media.url} alt="" className="w-full h-full object-cover" />
        )}

        {/* Navigation areas */}
        <div className="absolute inset-y-0 left-0 w-1/3 cursor-pointer" onClick={goPrev} />
        <div className="absolute inset-y-0 right-0 w-1/3 cursor-pointer" onClick={goNext} />

        {/* Caption */}
        {currentStory.caption && (
          <div className="absolute bottom-24 left-0 right-0 px-4">
            <p className="text-white text-sm font-semibold drop-shadow-lg text-center leading-relaxed">{currentStory.caption}</p>
          </div>
        )}

        {/* Bottom: Emoji + Comment */}
        <div
          className="absolute bottom-0 left-0 right-0 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Emoji reaction bar */}
          <div className="px-3 pb-1 flex items-center gap-2">
            <EmojiPicker
              storyId={currentStory._id}
              reactions={localReactions}
              currentUserId={user?._id}
              onReact={(emoji) => reactMutation.mutate(emoji)}
              paused={paused}
              setPaused={setPaused}
            />
            {/* Reaction summary */}
            {localReactions.length > 0 && (
              <div className="flex gap-0.5 text-sm">
                {[...new Map(localReactions.map((r) => [r.emoji, r])).values()]
                  .slice(0, 4)
                  .map((r) => (
                    <span key={r.emoji}>{r.emoji}</span>
                  ))}
              </div>
            )}
          </div>

          <CommentPanel
            storyId={currentStory._id}
            comments={localComments}
            onComment={(text) => {
              setPaused(true);
              commentMutation.mutate(text);
            }}
            onDeleteComment={(cid) => deleteCommentMutation.mutate(cid)}
            currentUserId={user?._id}
            storyAuthorId={authorGroup.author._id}
            setPaused={setPaused}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Story Ring Avatar ─────────────────────────────────────────────────────────

function StoryRingAvatar({ authorGroup, onClick }) {
  const hasUnviewed = authorGroup.hasUnviewed;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
      aria-label={`View ${authorGroup.author.name}'s story`}
    >
      <div className={cn('p-0.5 rounded-full transition-transform duration-300 group-hover:scale-105', hasUnviewed ? 'story-ring' : 'bg-border/60')}>
        <div className="p-0.5 rounded-full bg-background">
          <Avatar src={authorGroup.author.avatar} name={authorGroup.author.name} size="md" />
        </div>
      </div>
      <span className="text-[11px] text-foreground font-bold truncate max-w-[60px] group-hover:text-primary transition-colors">
        {authorGroup.author.name.split(' ')[0]}
      </span>
    </button>
  );
}

// ─── Main Export ───────────────────────────────────────────────────────────────

export default function StoryRing() {
  const { user } = useAuthStore();
  const [viewingStory, setViewingStory] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['stories'],
    queryFn: () => api.get('/stories').then((r) => r.data.data.stories),
    staleTime: 1000 * 60 * 5,
  });

  const stories = data || [];
  const myStoryGroup = stories.find((g) => g.author?._id === user?._id);
  const otherStories = stories.filter((g) => g.author?._id !== user?._id);

  return (
    <>
      <div className="rounded-3xl glass-card p-3.5 mb-5 shadow-sm border border-border/60">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide py-0.5">
          {/* Create / View story button */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div 
              className="relative group cursor-pointer" 
              onClick={() => myStoryGroup ? setViewingStory(myStoryGroup) : setShowCreateModal(true)}
            >
              <div className={cn('p-0.5 rounded-full transition-transform duration-300 group-hover:scale-105', myStoryGroup ? 'story-ring' : 'p-0')}>
                <div className="p-0.5 rounded-full bg-background">
                  <Avatar src={user?.avatar} name={user?.name} size="md" />
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateModal(true);
                }}
                className="absolute -bottom-0.5 -right-0.5 h-5.5 w-5.5 flex items-center justify-center rounded-full bg-nova-gradient text-white shadow-md hover:brightness-110 transition-all cursor-pointer z-10"
                aria-label="Create a story"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <span className="text-[11px] font-bold text-foreground">Your Story</span>
          </div>

          {/* Loading skeletons */}
          {isLoading && Array.from({ length: 5 }).map((_, i) => <StoryRingSkeleton key={i} />)}

          {/* Story rings */}
          {otherStories.map((group) => (
            <StoryRingAvatar
              key={group.author._id}
              authorGroup={group}
              onClick={() => setViewingStory(group)}
            />
          ))}
        </div>
      </div>

      {/* Story viewer overlay */}
      <AnimatePresence>
        {viewingStory && (
          <StoryViewer
            authorGroup={viewingStory}
            onClose={() => setViewingStory(null)}
          />
        )}
      </AnimatePresence>

      {/* Create story modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateStoryModal onClose={() => setShowCreateModal(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

