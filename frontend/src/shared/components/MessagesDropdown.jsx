import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MessageCircle, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/shared/api/axios.instance.js';
import Avatar from '@/shared/components/Avatar.jsx';
import { Skeleton } from '@/shared/components/Skeleton.jsx';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import { useSocketStore } from '@/shared/stores/socket.store.js';
import { useChatStore } from '@/shared/stores/chat.store.js';
import { cn } from '@/shared/utils/cn.js';
import { formatRelativeTime } from '@/shared/utils/formatters.js';

function ConvRow({ conversation, currentUserId, onClick }) {
  const isUserOnline = useSocketStore((s) => s.isUserOnline);
  const other = conversation.participants.find((p) => p._id !== currentUserId);
  const online = other?.isOnline || isUserOnline(other?._id);

  // Check if conversation has unread messages
  const lastMsg = conversation.lastMessage;
  const isLastOwn = lastMsg?.sender === currentUserId || lastMsg?.sender?._id === currentUserId;
  const isUnread = lastMsg && !isLastOwn && !lastMsg.readBy?.some((r) => {
    const id = typeof r.user === 'object' ? r.user?._id : r.user;
    return id?.toString() === currentUserId?.toString();
  });

  return (
    <button
      onClick={() => onClick(conversation, other)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 transition-colors text-left",
        isUnread ? "bg-primary/5 border-l-2 border-primary" : "hover:bg-accent"
      )}
    >
      <div className="relative shrink-0">
        <Avatar src={other?.avatar} name={other?.name} size="md" />
        {online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{other?.name}</p>
        <p className={cn(
          "text-xs truncate mt-0.5",
          isUnread ? "text-foreground font-semibold" : "text-muted-foreground"
        )}>
          {lastMsg?.content || 'Start a conversation'}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0 self-start pt-0.5">
        {conversation.lastMessageAt && (
          <span className="text-[11px] text-muted-foreground">
            {formatRelativeTime(conversation.lastMessageAt)}
          </span>
        )}
        {isUnread && (
          <span className="h-2 w-2 rounded-full bg-primary shrink-0" aria-label="Unread" />
        )}
      </div>
    </button>
  );
}

export default function MessagesDropdown() {
  const { user } = useAuthStore();
  const { isDropdownOpen, setDropdownOpen, openChat } = useChatStore();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const panelRef = useRef(null);
  const triggerRef = useRef(null);

  const { data: conversationsData, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/messages/conversations').then((r) => r.data.data.conversations),
    enabled: isDropdownOpen,
    staleTime: 30_000,
  });

  const conversations = conversationsData || [];
  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    const other = c.participants.find((p) => p._id !== user?._id);
    return (
      other?.name?.toLowerCase().includes(search.toLowerCase()) ||
      other?.username?.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Start a new conversation from friends
  const startConversation = useMutation({
    mutationFn: (userId) => api.post('/messages/conversations', { userId }).then((r) => r.data.data),
    onSuccess: (data, _userId) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      const conv = data.conversation;
      const other = conv.participants.find((p) => p._id !== user?._id);
      openChat(conv._id, other);
    },
  });

  // Click outside → close
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handler = (e) => {
      if (!panelRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isDropdownOpen, setDropdownOpen]);

  const handleConvClick = (conv, other) => {
    openChat(conv._id, other);
  };

  return { panelRef, triggerRef, filtered, isLoading, search, setSearch, handleConvClick };
}

/**
 * The actual JSX panel — used in Navbar.
 * Accepts refs and state from MessagesDropdown hook.
 */
export function MessagesPanel({ panelRef, filtered, isLoading, search, setSearch, currentUserId, onConvClick, onClose }) {
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
        <h3 className="font-bold text-base text-foreground">Messages</h3>
        <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="New message">
          <Edit className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Messenger"
            className="w-full h-9 pl-9 pr-8 rounded-full bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto scrollbar-hide" style={{ maxHeight: 400 }}>
        {isLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-1 py-2">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {search ? 'No conversations found' : 'No messages yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filtered.map((conv) => (
              <ConvRow
                key={conv._id}
                conversation={conv}
                currentUserId={currentUserId}
                onClick={onConvClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border/50 px-4 py-2.5">
        <Link
          to="/messages"
          onClick={onClose}
          className="text-xs text-primary hover:text-primary/80 font-semibold transition-colors inline-block"
        >
          See all in Messenger →
        </Link>
      </div>
    </motion.div>
  );
}
