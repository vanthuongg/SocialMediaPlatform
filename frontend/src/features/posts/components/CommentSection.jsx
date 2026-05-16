import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, Reply, Trash2, Send, ChevronDown, ChevronUp, MoreHorizontal, Edit2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Avatar from '@/shared/components/Avatar.jsx';
import { Skeleton } from '@/shared/components/Skeleton.jsx';
import { formatRelativeTime } from '@/shared/utils/formatters.js';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import api from '@/shared/api/axios.instance.js';
import { toast } from '@/shared/hooks/useToast.js';
import { cn } from '@/shared/utils/cn.js';

function CommentItem({ comment, postId, depth = 0, parentCommentId = null }) {
  const { user: currentUser } = useAuthStore();
  const qc = useQueryClient();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplies, setShowReplies] = useState(false);
  const [localLiked, setLocalLiked] = useState(comment.userReaction === 'like');
  const [localLikes, setLocalLikes] = useState(comment.totalReactions || 0);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content || '');
  const [showMenu, setShowMenu] = useState(false);

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

  const isOwner = currentUser?._id === comment.author?._id;
  const canEdit = isOwner;
  const canDelete = isOwner || currentUser?.role === 'admin' || currentUser?.role === 'moderator';

  const reactMutation = useMutation({
    mutationFn: () => api.post(`/comments/${comment._id}/react`, { type: 'like' }),
    onMutate: () => {
      const nextLiked = !localLiked;
      setLocalLiked(nextLiked);
      setLocalLikes((c) => nextLiked ? c + 1 : Math.max(0, c - 1));
    },
    onError: () => {
      setLocalLiked(localLiked);
      setLocalLikes(localLikes);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', postId] });
      if (depth === 1 && parentCommentId) {
        qc.invalidateQueries({ queryKey: ['commentReplies', parentCommentId] });
      }
    }
  });

  const editCommentMutation = useMutation({
    mutationFn: (content) => api.patch(`/comments/${comment._id}`, { content }),
    onMutate: () => {
      const toastId = toast.loading('Saving comment...');
      return { toastId };
    },
    onSuccess: (data, variables, context) => {
      toast.success('Comment updated!', { id: context?.toastId });
      setIsEditing(false);
      qc.invalidateQueries({ queryKey: ['comments', postId] });
      if (depth === 1 && parentCommentId) {
        qc.invalidateQueries({ queryKey: ['commentReplies', parentCommentId] });
      }
    },
    onError: (err, variables, context) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update comment', { id: context?.toastId });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/comments/${comment._id}`),
    onMutate: () => {
      const toastId = toast.loading('Deleting comment...');
      return { toastId };
    },
    onSuccess: (data, variables, context) => {
      toast.success('Comment deleted', { id: context?.toastId });
      qc.invalidateQueries({ queryKey: ['comments', postId] });
      if (depth === 1) {
        qc.invalidateQueries({ queryKey: ['commentReplies', parentCommentId] });
      }
    },
    onError: (err, variables, context) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete comment', { id: context?.toastId });
    },
  });

  const replyMutation = useMutation({
    mutationFn: (content) => {
      const parentId = depth === 0 ? comment._id : parentCommentId;
      return api.post(`/posts/${postId}/comments`, { content, parentComment: parentId });
    },
    onMutate: () => {
      const toastId = toast.loading('Posting reply...');
      return { toastId };
    },
    onSuccess: (data, variables, context) => {
      toast.success('Reply posted!', { id: context?.toastId });
      setReplyText('');
      setShowReplyInput(false);
      setShowReplies(true);
      qc.invalidateQueries({ queryKey: ['commentReplies', depth === 0 ? comment._id : parentCommentId] });
      qc.invalidateQueries({ queryKey: ['comments', postId] });
    },
    onError: (err, variables, context) => {
      toast.error(err.response?.data?.error?.message || 'Failed to reply', { id: context?.toastId });
    },
  });

  const handleReply = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    replyMutation.mutate(replyText.trim());
  };

  const handleReplyClick = () => {
    setShowReplyInput((v) => !v);
    if (!showReplyInput) {
      setReplyText(depth === 0 ? '' : `@${comment.author?.username} `);
    }
  };

  // Fetch replies when showing thread (only for root comments)
  const { data: repliesData, isLoading: isRepliesLoading } = useQuery({
    queryKey: ['commentReplies', comment._id],
    queryFn: () => api.get(`/comments/${comment._id}/replies`).then((r) => r.data.data),
    enabled: showReplies && depth === 0,
  });

  const replies = depth === 0 ? (repliesData || []) : [];

  // Sort and group replies so replies to replies appear directly below their parent
  const orderedReplies = useMemo(() => {
    if (replies.length <= 1) return replies;

    const replyMap = new Map();
    replies.forEach(r => {
      if (r.author?.username) replyMap.set(r.author.username, r);
    });

    const childMap = new Map();
    const roots = [];

    replies.forEach(r => {
      const match = r.content.match(/^@(\w+)\s/);
      const mentionedUsername = match ? match[1] : null;

      if (mentionedUsername && replyMap.has(mentionedUsername)) {
        if (!childMap.has(mentionedUsername)) {
          childMap.set(mentionedUsername, []);
        }
        childMap.get(mentionedUsername).push(r);
      } else {
        roots.push(r);
      }
    });

    const result = [];
    const visit = (reply) => {
      result.push(reply);
      const children = childMap.get(reply.author?.username) || [];
      children.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      children.forEach(child => visit(child));
    };

    roots.forEach(root => visit(root));

    // Append any orphaned replies
    const resultSet = new Set(result);
    replies.forEach(r => {
      if (!resultSet.has(r)) result.push(r);
    });

    return result;
  }, [replies]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-2.5', depth > 0 && 'ml-8 mt-2')}
    >
      <Link to={`/${comment.author?.username}`} className="shrink-0 mt-0.5">
        <Avatar src={comment.author?.avatar} name={comment.author?.name} size="sm" />
      </Link>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (!editText.trim()) return;
              editCommentMutation.mutate(editText.trim());
            }}
            className="mt-1 space-y-1.5 bg-accent rounded-xl p-2 max-w-full inline-block min-w-[200px]"
          >
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full text-sm bg-transparent border-0 focus:ring-0 focus:outline-none resize-none text-foreground px-2 py-1 leading-relaxed"
              rows={2}
              autoFocus
            />
            <div className="flex justify-end gap-1.5 px-2">
              <button
                type="button"
                onClick={() => { setIsEditing(false); setEditText(comment.content); }}
                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold border border-border hover:bg-card text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!editText.trim() || editCommentMutation.isPending}
                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          </form>
        ) : (
          /* Bubble Wrapper */
          <div className="flex items-center gap-2 group/bubble">
            {/* Bubble */}
            <div className="inline-block bg-accent rounded-2xl rounded-tl-sm px-3 py-2 max-w-full relative pb-2.5">
              <Link
                to={`/${comment.author?.username}`}
                className="text-xs font-semibold text-foreground hover:text-primary transition-colors"
              >
                {comment.author?.name}
              </Link>
              {comment.isEdited && (
                <span className="text-[10px] text-muted-foreground ml-1.5">(edited)</span>
              )}
              <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-words">
                {comment.content.split(/(#\w+|@\w+)/g).map((part, i) => {
                  if (part.startsWith('@')) {
                    return (
                      <Link 
                        key={i} 
                        to={`/${part.slice(1)}`} 
                        className="text-primary font-bold hover:underline"
                      >
                        {part}
                      </Link>
                    );
                  }
                  return part;
                })}
              </p>

              {/* Like button & count at bottom right */}
              <button
                onClick={() => reactMutation.mutate()}
                className={cn(
                  "absolute -bottom-2.5 right-2 z-20 flex items-center gap-0.5 rounded-full bg-card/95 backdrop-blur-sm px-1.5 py-0.5 border border-border/60 text-[9px] shadow-nova-sm select-none cursor-pointer transition-all active:scale-95",
                  localLiked 
                    ? "opacity-100 text-blue-500" 
                    : localLikes > 0 
                      ? "opacity-100 text-muted-foreground" 
                      : "opacity-0 group-hover/bubble:opacity-100 focus:opacity-100 text-muted-foreground/60 hover:text-blue-500"
                )}
                aria-label={localLiked ? "Unlike comment" : "Like comment"}
              >
                {localLikes > 0 ? (
                  <>
                    <span className="text-[10px] leading-none">👍</span>
                    <span className="font-bold text-foreground/80 ml-0.5">{localLikes}</span>
                  </>
                ) : (
                  <ThumbsUp className="h-3 w-3" />
                )}
              </button>
            </div>

            {/* Options Menu Button (Edit/Delete) */}
            {(canEdit || canDelete) && (
              <div className="relative shrink-0">
                <button
                  ref={btnRef}
                  onClick={() => setShowMenu((v) => !v)}
                  className="p-1 rounded-full text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent/80 opacity-0 group-hover/bubble:opacity-100 transition-opacity cursor-pointer"
                  aria-label="Comment options"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>

                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      ref={menuRef}
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.1 }}
                      className="absolute left-0 top-full mt-1 z-40 w-28 rounded-lg border border-border bg-card shadow-lg py-1 pointer-events-auto"
                    >
                      {canEdit && (
                        <button
                          onClick={() => { setIsEditing(true); setShowMenu(false); }}
                          className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-xs text-foreground hover:bg-accent transition-colors text-left font-medium cursor-pointer"
                        >
                          <Edit2 className="h-3 w-3 text-muted-foreground" />
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => { deleteMutation.mutate(); setShowMenu(false); }}
                          className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors text-left font-medium cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {!isEditing && (
          <div className="flex items-center gap-3 mt-1.5 px-1">
            <span className="text-[10px] text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>

            <button
              onClick={handleReplyClick}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Reply
            </button>
          </div>
        )}

        {/* Reply input */}
        <AnimatePresence>
          {showReplyInput && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleReply}
              className="flex gap-2 mt-2 ml-1"
            >
              <Avatar src={currentUser?.avatar} name={currentUser?.name} size="xs" className="shrink-0 mt-1" />
              <div className="flex-1 flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={depth === 0 ? `Reply to ${comment.author?.name}...` : `Reply to ${comment.author?.name} in this thread...`}
                  className="flex-1 bg-transparent text-sm focus:outline-none text-foreground placeholder:text-muted-foreground"
                  autoFocus
                  aria-label="Reply input"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || replyMutation.isPending}
                  className="text-primary disabled:opacity-40 shrink-0"
                  aria-label="Send reply"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Show/hide replies */}
        {comment.replyCount > 0 && depth === 0 && (
          <button
            onClick={() => setShowReplies((v) => !v)}
            className="flex items-center gap-1 mt-2 ml-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
          >
            {showReplies ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showReplies ? 'Hide replies' : `View ${comment.replyCount} ${comment.replyCount === 1 ? 'reply' : 'replies'}`}
          </button>
        )}

        {isRepliesLoading && showReplies && (
          <div className="text-[10px] text-muted-foreground ml-8 mt-2.5 animate-pulse font-semibold">
            Loading replies...
          </div>
        )}

        {/* Nested replies */}
        <AnimatePresence>
          {showReplies && orderedReplies.map((reply) => (
            <CommentItem key={reply._id} comment={reply} postId={postId} depth={1} parentCommentId={comment._id} />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function CommentSection({ postId, commentCount }) {
  const { user: currentUser } = useAuthStore();
  const qc = useQueryClient();
  const [newComment, setNewComment] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => api.get(`/posts/${postId}/comments`).then((r) => r.data.data.comments),
  });

  const addCommentMutation = useMutation({
    mutationFn: (content) => api.post(`/posts/${postId}/comments`, { content }),
    onMutate: () => {
      const toastId = toast.loading('Posting comment...');
      return { toastId };
    },
    onSuccess: (data, variables, context) => {
      toast.success('Comment posted!', { id: context?.toastId });
      setNewComment('');
      qc.invalidateQueries({ queryKey: ['comments', postId] });
      qc.invalidateQueries({ queryKey: ['feed'] });
    },
    onError: (err, variables, context) => {
      toast.error(err.response?.data?.error?.message || 'Failed to add comment', { id: context?.toastId });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment.trim());
  };

  const comments = data || [];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="border-t border-border mt-1 pt-3 space-y-3"
    >
      {/* Comment input */}
      <form onSubmit={handleSubmit} className="flex gap-2.5 items-center">
        <Avatar src={currentUser?.avatar} name={currentUser?.name} size="sm" className="shrink-0" />
        <div className="flex-1 flex items-center gap-2 rounded-full bg-muted px-4 py-2">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 bg-transparent text-sm focus:outline-none text-foreground placeholder:text-muted-foreground"
            aria-label="Comment input"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || addCommentMutation.isPending}
            className="text-primary disabled:opacity-40 shrink-0 transition-opacity"
            aria-label="Post comment"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>

      {/* Comments list */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-2.5">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <Skeleton className="h-14 flex-1 rounded-2xl" />
            </div>
          ))
        ) : comments.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-4">
            No comments yet. Be the first!
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {comments.map((comment) => (
              <CommentItem key={comment._id} comment={comment} postId={postId} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
