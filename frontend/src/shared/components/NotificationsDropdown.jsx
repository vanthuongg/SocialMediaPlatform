import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bell, Check, BellOff, UserCheck, UserX } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
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

function NotificationRow({ notification, onRead, onClose }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const meta = NOTIFICATION_TYPE_META[notification.type] || { label: notification.message, emoji: '🔔' };

  const [friendStatus, setFriendStatus] = useState(null); // 'accepted' | 'declined' | null

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

  const handleRowClick = () => {
    if (!notification.isRead) {
      onRead(notification._id);
    }
    onClose();
    const isPostEntity = ['reaction', 'comment', 'reply', 'mention', 'share', 'tag'].includes(notification.type) || notification.entityModel === 'Post';
    if (isPostEntity && notification.entity) {
      const postId = typeof notification.entity === 'object' ? notification.entity._id : notification.entity;
      navigate(`/posts/${postId}`);
    } else {
      navigate(`/${notification.actor?.username}`);
    }
  };

  return (
    <div
      onClick={handleRowClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 transition-colors text-left group cursor-pointer',
        !notification.isRead ? 'bg-primary/5 border-l-2 border-primary' : 'hover:bg-accent'
      )}
    >
      <Link
        to={`/${notification.actor?.username}`}
        className="shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <Avatar src={notification.actor?.avatar} name={notification.actor?.name} size="md" />
      </Link>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">
          <Link
            to={`/${notification.actor?.username}`}
            className="font-semibold hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            {notification.actor?.name}
          </Link>{' '}
          <span className="text-muted-foreground">{meta.label}</span>
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{formatRelativeTime(notification.createdAt)}</p>

        {notification.type === 'friend_request' && (
          <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
            {friendStatus === 'accepted' ? (
              <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Accepted
              </span>
            ) : friendStatus === 'declined' ? (
              <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                Declined
              </span>
            ) : (
              <>
                <Button
                  size="xs"
                  variant="gradient"
                  onClick={() => acceptRequestMutation.mutate(notification.actor?._id)}
                  isLoading={acceptRequestMutation.isPending}
                  className="h-7 text-[11px] px-2.5 font-bold"
                >
                  <UserCheck className="h-3 w-3 mr-1 shrink-0" /> Accept
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => declineRequestMutation.mutate(notification.actor?._id)}
                  isLoading={declineRequestMutation.isPending}
                  className="h-7 text-[11px] px-2.5 font-bold"
                >
                  Decline
                </Button>
              </>
            )}
          </div>
        )}
      </div>
      <span className="text-lg shrink-0 self-center">{meta.emoji}</span>
      {!notification.isRead && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRead(notification._id);
          }}
          className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent opacity-0 group-hover:opacity-100 transition-all"
          title="Mark as read"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export default function NotificationsDropdown({ panelRef, isOpen, onClose }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: () => api.get('/notifications?limit=5').then((r) => r.data),
    enabled: isOpen,
    staleTime: 10_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications = Array.isArray(data?.data) ? data.data : (data?.data?.notifications || []);

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-80 z-50 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="font-bold text-base text-foreground">Notifications</h3>
      </div>

      {/* List */}
      <div className="overflow-y-auto scrollbar-hide" style={{ maxHeight: 400 }}>
        {isLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-1 py-2">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-2.5 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-10 text-center">
            <BellOff className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {notifications.map((notification) => (
              <NotificationRow
                key={notification._id}
                notification={notification}
                onRead={(id) => markReadMutation.mutate(id)}
                onClose={onClose}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border/50 px-4 py-2.5 bg-muted/20">
        <Link
          to="/notifications"
          onClick={onClose}
          className="block text-center text-xs text-primary hover:text-primary/80 font-semibold transition-colors"
        >
          Xem tất cả thông báo
        </Link>
      </div>
    </motion.div>
  );
}
