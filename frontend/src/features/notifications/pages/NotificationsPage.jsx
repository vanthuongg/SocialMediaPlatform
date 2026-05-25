import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, BellOff, Check, ArrowLeft, Trash2, UserCheck, UserX } from 'lucide-react';
import api from '@/shared/api/axios.instance.js';
import Avatar from '@/shared/components/Avatar.jsx';
import Button from '@/shared/components/Button.jsx';
import { Skeleton } from '@/shared/components/Skeleton.jsx';
import { formatRelativeTime } from '@/shared/utils/formatters.js';
import { cn } from '@/shared/utils/cn.js';
import { toast } from '@/shared/hooks/useToast.js';

const NOTIFICATION_TYPE_META = {
  reaction: { label: 'reacted to your post', emoji: '❤️' },
  comment: { label: 'commented on your post', emoji: '💬' },
  reply: { label: 'replied to your comment', emoji: '↩️' },
  friend_request: { label: 'sent you a friend request', emoji: '👋' },
  friend_accept: { label: 'accepted your friend request', emoji: '🎉' },
  follow: { label: 'started following you', emoji: '✨' },
  mention: { label: 'mentioned you', emoji: '@' },
  share: { label: 'shared your post', emoji: '🔁' },
};

function NotificationItem({ notification }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const meta = NOTIFICATION_TYPE_META[notification.type] || { label: notification.message, emoji: '🔔' };

  const [friendStatus, setFriendStatus] = useState(null); // 'accepted' | 'declined' | null

  const markReadMutation = useMutation({
    mutationFn: () => api.patch(`/notifications/${notification._id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/notifications/${notification._id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification deleted');
    },
    onError: () => toast.error('Failed to delete notification'),
  });

  const acceptRequestMutation = useMutation({
    mutationFn: (userId) => api.patch(`/users/${userId}/friend-request/accept`),
    onSuccess: () => {
      setFriendStatus('accepted');
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['friends'] });
      qc.invalidateQueries({ queryKey: ['friendRequests'] });
      toast.success('Friend request accepted!');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to accept request'),
  });

  const declineRequestMutation = useMutation({
    mutationFn: (userId) => api.patch(`/users/${userId}/friend-request/decline`),
    onSuccess: () => {
      setFriendStatus('declined');
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['friendRequests'] });
      toast.info('Friend request declined');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to decline request'),
  });

  const handleItemClick = () => {
    if (!notification.isRead) markReadMutation.mutate();
    const isPostEntity =
      ['reaction', 'comment', 'reply', 'mention', 'share', 'tag'].includes(notification.type) ||
      notification.entityModel === 'Post';
    if (isPostEntity && notification.entity) {
      const postId = typeof notification.entity === 'object' ? notification.entity._id : notification.entity;
      navigate(`/posts/${postId}`);
    } else {
      navigate(`/${notification.actor?.username}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8, height: 0, marginBottom: 0 }}
      onClick={handleItemClick}
      className={cn(
        'flex items-center gap-3 p-4 rounded-xl transition-colors duration-200 group cursor-pointer',
        !notification.isRead ? 'bg-primary/5 border border-primary/20' : 'hover:bg-accent'
      )}
    >
      {/* Unread dot */}
      {!notification.isRead && (
        <span className="h-2 w-2 rounded-full bg-primary shrink-0" aria-label="Unread" />
      )}

      <Link
        to={`/${notification.actor?.username}`}
        className="shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Avatar src={notification.actor?.avatar} name={notification.actor?.name} size="md" />
      </Link>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">
          <Link
            to={`/${notification.actor?.username}`}
            className="font-semibold hover:text-primary transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {notification.actor?.name}
          </Link>{' '}
          <span className="text-muted-foreground">{meta.label}</span>
        </p>
        <p className="text-xs text-muted-foreground">{formatRelativeTime(notification.createdAt)}</p>

        {notification.type === 'friend_request' && (
          <div className="flex items-center gap-2 mt-2.5" onClick={(e) => e.stopPropagation()}>
            {friendStatus === 'accepted' ? (
              <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                Accepted
              </span>
            ) : friendStatus === 'declined' ? (
              <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                Declined
              </span>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="gradient"
                  onClick={() => acceptRequestMutation.mutate(notification.actor?._id)}
                  isLoading={acceptRequestMutation.isPending}
                  className="font-bold flex items-center"
                >
                  <UserCheck className="h-4 w-4" /> Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => declineRequestMutation.mutate(notification.actor?._id)}
                  isLoading={declineRequestMutation.isPending}
                  className="font-bold"
                >
                  Decline
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <span className="text-2xl shrink-0">{meta.emoji}</span>

      {/* Action buttons — visible on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
        {!notification.isRead && (
          <button
            onClick={(e) => { e.stopPropagation(); markReadMutation.mutate(); }}
            className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            aria-label="Mark as read"
            title="Mark as read"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(); }}
          disabled={deleteMutation.isPending}
          className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50"
          aria-label="Delete notification"
          title="Delete notification"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?limit=50').then((r) => r.data),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => api.delete('/notifications/clear-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications cleared');
    },
    onError: () => toast.error('Failed to clear notifications'),
  });

  const notifications = Array.isArray(data?.data) ? data.data : [];
  const unreadCount = data?.meta?.unreadCount ?? 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Bell className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {unreadCount}
            </span>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllMutation.mutate()}
                isLoading={markAllMutation.isPending}
              >
                <Check className="h-4 w-4" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearAllMutation.mutate()}
              isLoading={clearAllMutation.isPending}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Notifications list */}
      <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <BellOff className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-semibold text-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground">We'll notify you when something happens</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            <AnimatePresence initial={false}>
              {notifications.map((notification) => (
                <NotificationItem key={notification._id} notification={notification} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
