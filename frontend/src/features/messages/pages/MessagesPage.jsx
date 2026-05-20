// [auto] Real-time chat with socket.io
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { Send, Search, MessageCircle, ArrowLeft, Paperclip, Smile, Phone, Video, Pin, PinOff, MoreHorizontal, X, ImageIcon, Users, Check, PhoneOff } from 'lucide-react';
import { useChatStore } from '@/shared/stores/chat.store.js';
import * as Popover from '@radix-ui/react-popover';
import { useInView } from 'react-intersection-observer';
import api from '@/shared/api/axios.instance.js';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import { useSocketStore } from '@/shared/stores/socket.store.js';
import Avatar from '@/shared/components/Avatar.jsx';
import { Skeleton } from '@/shared/components/Skeleton.jsx';
import Button from '@/shared/components/Button.jsx';
import Input from '@/shared/components/Input.jsx';
import Modal from '@/shared/components/Modal.jsx';
import { cn } from '@/shared/utils/cn.js';
import { formatTime, formatRelativeTime } from '@/shared/utils/formatters.js';
import { toast } from '@/shared/hooks/useToast.js';

const EMOJIS = ['😀', '😂', '🥰', '😎', '😭', '😡', '👍', '❤️', '🔥', '✨', '🎉', '🙌', '🤔', '👀', '💯', '🙏'];

function MessageBubble({ message, isOwn, onTogglePin, isLastRead, isLastSentUnread, otherParticipant }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-2 items-end max-w-[75%] group', isOwn ? 'ml-auto flex-row-reverse' : '')}
    >
      {!isOwn && (
        <Avatar src={message.sender?.avatar} name={message.sender?.name} size="xs" className="shrink-0 mb-1" />
      )}
      
      <div className={cn("flex flex-col", isOwn ? "items-end" : "items-start")}>
        {message.isPinned && (
          <div className="flex items-center gap-1 text-[10px] text-primary mb-1 px-1 font-semibold">
            <Pin className="h-3 w-3" /> Pinned
          </div>
        )}
        
        <div className="flex items-center gap-2">
          {isOwn && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onTogglePin(message)}
                className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground transition-colors"
                title={message.isPinned ? "Unpin message" : "Pin message"}
              >
                {message.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}

          <div
            className={cn(
              'px-3.5 py-2 rounded-2xl text-sm leading-relaxed relative',
              isOwn
                ? 'bg-primary text-primary-foreground rounded-br-sm'
                : 'bg-muted text-foreground rounded-bl-sm'
            )}
          >
            {message.media && (
              <div className="mb-2 rounded-lg overflow-hidden max-w-[240px]">
                {message.media.type === 'image' ? (
                  <img src={message.media.url} alt="Attachment" className="w-full h-auto object-cover rounded-md" />
                ) : message.media.type === 'video' ? (
                  <video src={message.media.url} controls className="w-full h-auto rounded-md" />
                ) : message.media.type === 'audio' ? (
                  <audio src={message.media.url} controls className="w-full max-w-[200px]" />
                ) : (
                  <a href={message.media.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-background/20 hover:bg-background/40 transition-colors rounded-md text-xs font-medium text-foreground no-underline">
                    <Paperclip className="h-4 w-4 shrink-0" />
                    <span className="truncate">{message.media.fileName || 'Attached File'}</span>
                  </a>
                )}
              </div>
            )}
            {message.content}
            <p className={cn('text-[10px] mt-0.5', isOwn ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground')}>
              {formatTime(message.createdAt)}
            </p>
          </div>

          {!isOwn && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onTogglePin(message)}
                className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground transition-colors"
                title={message.isPinned ? "Unpin message" : "Pin message"}
              >
                {message.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
        </div>
        
        {isOwn && (
          <div className="mt-1 min-h-[18px] flex items-center justify-end">
            {isLastRead && otherParticipant && (
              <Avatar 
                src={otherParticipant.avatar} 
                name={otherParticipant.name} 
                size="xxs" 
                className="ring-1 ring-card shrink-0" 
                title={`Seen by ${otherParticipant.name}`}
              />
            )}
            {isLastSentUnread && (
              <span className="text-[9px] font-semibold text-muted-foreground bg-accent/40 px-1.5 py-0.5 rounded-full select-none">
                Delivered
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

const VN_DAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

function formatChatTimestamp(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = yesterday.toDateString() === date.toDateString();
  if (isYesterday) {
    return 'Hôm qua';
  }
  
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return VN_DAYS[date.getDay()];
  }
  
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('vi-VN', {
      month: 'numeric',
      day: 'numeric'
    });
  }
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
}

function ConversationItem({ conversation, isActive, onClick }) {
  const { user: currentUser } = useAuthStore();
  const isUserOnline = useSocketStore((s) => s.isUserOnline);
  const otherParticipant = conversation.participants.find((p) => p._id !== currentUser?._id);
  const isOnline = !conversation.isGroupChat && (otherParticipant?.isOnline || (otherParticipant && isUserOnline(otherParticipant._id)));

  const displayName = conversation.isGroupChat ? conversation.groupName : (otherParticipant?.name || 'Conversation');
  const displayAvatar = conversation.isGroupChat ? conversation.groupAvatar : otherParticipant?.avatar;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors duration-200',
        isActive ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
      )}
    >
      <Avatar
        src={displayAvatar}
        name={displayName}
        size="md"
        isOnline={isOnline}
      />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground truncate">{displayName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {conversation.lastMessage?.content || 'Start a conversation'}
        </p>
      </div>
      <div className="shrink-0 text-[10px] font-semibold text-muted-foreground">
        {conversation.lastMessageAt && formatChatTimestamp(conversation.lastMessageAt)}
      </div>
    </button>
  );
}

export default function MessagesPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const qc = useQueryClient();
  const socket = useSocketStore((s) => s.socket);
  const isUserOnline = useSocketStore((s) => s.isUserOnline);
  
  const activeCallState = useChatStore((s) => s.activeCalls[conversationId]);
  const setActiveCallGlobal = useChatStore((s) => s.setActiveCall);
  const clearActiveCallGlobal = useChatStore((s) => s.clearActiveCall);
  const openChat = useChatStore((s) => s.openChat);

  // Handle call timer increments locally when status is connected
  useEffect(() => {
    if (!activeCallState || activeCallState.status !== 'connected') return;

    const timer = setInterval(() => {
      setActiveCallGlobal(conversationId, {
        ...activeCallState,
        duration: activeCallState.duration + 1,
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeCallState?.status, activeCallState?.duration, conversationId, setActiveCallGlobal]);
  
  const [message, setMessage] = useState('');
  const [convSearch, setConvSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Group modal states
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  // Fetch friends list for group invitation
  const { data: friendsData, isLoading: isFriendsLoading } = useQuery({
    queryKey: ['friends'],
    queryFn: () => api.get('/users/me/friends').then((r) => r.data.data),
    enabled: showGroupModal,
  });

  const friends = Array.isArray(friendsData) ? friendsData : (friendsData?.friends || []);

  // Group creation mutation
  const createGroupMutation = useMutation({
    mutationFn: (payload) => api.post('/messages/conversations/group', payload),
    onSuccess: (res) => {
      const conv = res.data.data.conversation;
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setShowGroupModal(false);
      setGroupName('');
      setSelectedMembers([]);
      navigate(`/messages/${conv._id}`);
      toast.success('Group chat created!');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to create group'),
  });

  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (!groupName.trim() || selectedMembers.length < 1) return;
    createGroupMutation.mutate({
      groupName: groupName.trim(),
      participants: selectedMembers,
    });
  };
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  const { ref: loadMoreRef, inView } = useInView();

  // Conversations list
  const { data: conversationsData, isLoading: isConvsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/messages/conversations').then((r) => r.data.data.conversations),
  });

  // Messages infinite query — backend marks messages as read on GET, so invalidate conversations after load
  const qcRef = useRef(qc);
  qcRef.current = qc;

  const { 
    data: msgsData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading: isMsgsLoading 
  } = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: ({ pageParam = null }) => 
      api.get(`/messages/conversations/${conversationId}`, { params: { cursor: pageParam } }).then((r) => {
        // Backend marks messages as read on fetch — refresh conversations badge
        qcRef.current.invalidateQueries({ queryKey: ['conversations'] });
        return r.data.data;
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      // Save scroll height before fetching more to preserve scroll position
      const scrollHeight = chatContainerRef.current?.scrollHeight;
      fetchNextPage().then(() => {
        if (chatContainerRef.current && scrollHeight) {
          const newScrollHeight = chatContainerRef.current.scrollHeight;
          chatContainerRef.current.scrollTop = newScrollHeight - scrollHeight;
        }
      });
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const sendMessageMutation = useMutation({
    mutationFn: (payload) => {
      // payload can be FormData or JSON
      const config = payload instanceof FormData 
        ? { headers: { 'Content-Type': 'multipart/form-data' } } 
        : {};
      return api.post(`/messages/conversations/${conversationId}/messages`, payload, config);
    },
    onSuccess: () => {
      setMessage('');
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });


  const togglePinMutation = useMutation({
    mutationFn: (msg) => api.patch(`/messages/conversations/${conversationId}/messages/${msg._id}/pin`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });

  // Real-time socket listener
  useEffect(() => {
    if (!socket) return;

    const handleMessageUpdate = (data) => {
      if (data.conversationId === conversationId) {
        qc.invalidateQueries({ queryKey: ['messages', conversationId] });
        qc.invalidateQueries({ queryKey: ['conversations'] });
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };

    socket.on('message:new', handleMessageUpdate);
    socket.on('message:update', handleMessageUpdate);

    // When our messages are read by the other party, refresh conversations (unread badge)
    const handleReadReceipt = (data) => {
      if (data.conversationId === conversationId) {
        qc.invalidateQueries({ queryKey: ['conversations'] });
      }
    };
    socket.on('message:read', handleReadReceipt);
    
    return () => {
      socket.off('message:new', handleMessageUpdate);
      socket.off('message:update', handleMessageUpdate);
      socket.off('message:read', handleReadReceipt);
    };
  }, [socket, conversationId, qc]);

  const conversations = conversationsData || [];
  const filteredConversations = conversations.filter((c) => {
    if (!convSearch.trim()) return true;
    if (c.isGroupChat) {
      return c.groupName?.toLowerCase().includes(convSearch.toLowerCase());
    }
    const other = c.participants.find((p) => p._id !== currentUser?._id);
    return other?.name?.toLowerCase().includes(convSearch.toLowerCase()) ||
      other?.username?.toLowerCase().includes(convSearch.toLowerCase());
  });

  const allMessages = useMemo(() => {
    if (!msgsData) return [];
    return [...msgsData.pages].reverse().flatMap(p => p.messages);
  }, [msgsData]);

  const activeConversation = conversations.find((c) => c._id === conversationId);
  const isGroup = activeConversation?.isGroupChat;
  const otherParticipant = isGroup ? null : activeConversation?.participants.find((p) => p._id !== currentUser?._id);
  const chatHeaderIsOnline = !isGroup && (otherParticipant?.isOnline || (otherParticipant && isUserOnline(otherParticipant._id)));

  const pinnedMessage = useMemo(() => allMessages.find(m => m.isPinned), [allMessages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim() && !selectedFile) return;

    if (selectedFile) {
      const formData = new FormData();
      if (message.trim()) formData.append('content', message.trim());
      formData.append('media', selectedFile);
      sendMessageMutation.mutate(formData);
    } else {
      sendMessageMutation.mutate({ content: message.trim() });
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        return toast.error('File must be less than 10MB');
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const cancelAttachment = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const acceptCall = () => {
    if (!activeCallState) return;
    setActiveCallGlobal(conversationId, {
      ...activeCallState,
      status: 'connected',
    });
    if (socket) {
      socket.emit('call:accept', {
        conversationId,
        callerId: activeCallState.participant?._id,
      });
    }
  };

  const declineCall = () => {
    if (!activeCallState) return;
    clearActiveCallGlobal(conversationId);
    if (socket) {
      socket.emit('call:decline', {
        conversationId,
        callerId: activeCallState.participant?._id,
      });
    }
  };

  const endCall = () => {
    if (!activeCallState) return;

    if (activeCallState.role === 'caller') {
      const isVideo = activeCallState.type === 'Video';
      const icon = isVideo ? '📹' : '📞';
      const content = activeCallState.status === 'connected'
        ? `${icon} Cuộc gọi đi (${Math.floor(activeCallState.duration / 60).toString().padStart(2, '0')}:${(activeCallState.duration % 60).toString().padStart(2, '0')})`
        : `${icon} Cuộc gọi nhỡ`;

      api.post(`/messages/conversations/${conversationId}/messages`, { content })
        .then(() => {
          qc.invalidateQueries({ queryKey: ['messages', conversationId] });
          qc.invalidateQueries({ queryKey: ['popup-messages', conversationId] });
          qc.invalidateQueries({ queryKey: ['conversations'] });
        })
        .catch((err) => console.error('Failed to save call log:', err));
    }

    clearActiveCallGlobal(conversationId);
    if (socket) {
      socket.emit('call:end', {
        conversationId,
        targetUserId: activeCallState.participant?._id,
      });
    }
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleCall = (type) => {
    if (!otherParticipant) return;
    const callPayload = { type, role: 'caller', status: 'ringing', participant: otherParticipant, duration: 0 };
    setActiveCallGlobal(conversationId, callPayload);
    toast.info(`Calling ${otherParticipant.name}...`);

    if (socket) {
      socket.emit('call:start', {
        conversationId,
        targetUserId: otherParticipant._id,
        type,
      });
    }
  };

  const renderMessages = () => {
    const elements = [];
    let lastDate = null;

    // Find the ID of the last message read by the other participant
    let lastReadMessageId = null;
    if (otherParticipant && allMessages.length) {
      for (let i = allMessages.length - 1; i >= 0; i--) {
        const msg = allMessages[i];
        if (msg.sender?._id === currentUser?._id) {
          const hasBeenRead = msg.readBy?.some(r => (r.user?._id || r.user) === otherParticipant._id);
          if (hasBeenRead) {
            lastReadMessageId = msg._id;
            break;
          }
        }
      }
    }

    // Find if the overall last message in the chat is sent by us and is unread
    const lastMessage = allMessages[allMessages.length - 1];
    const isLastSentUnread = lastMessage && 
      lastMessage.sender?._id === currentUser?._id && 
      (!lastMessage.readBy || !lastMessage.readBy.some(r => (r.user?._id || r.user) === otherParticipant?._id));

    allMessages.forEach((msg) => {
      if (!msg.createdAt) return;
      const msgDate = new Date(msg.createdAt);
      const dayString = msgDate.toDateString();

      if (dayString !== lastDate) {
        lastDate = dayString;
        
        let headerText = '';
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (dayString === today.toDateString()) {
          headerText = 'Hôm nay';
        } else if (dayString === yesterday.toDateString()) {
          headerText = 'Hôm qua';
        } else {
          headerText = msgDate.toLocaleDateString('vi-VN', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          });
        }

        elements.push(
          <div key={`date-header-${msg._id}`} className="flex justify-center my-4 select-none">
            <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground/80 bg-accent/60 px-3 py-1 rounded-full border border-border/30 shadow-nova-sm">
              {headerText}
            </span>
          </div>
        );
      }

      elements.push(
        <MessageBubble
          key={msg._id}
          message={msg}
          isOwn={msg.sender?._id === currentUser?._id}
          onTogglePin={(m) => togglePinMutation.mutate(m)}
          isLastRead={msg._id === lastReadMessageId}
          isLastSentUnread={isLastSentUnread && msg._id === lastMessage._id}
          otherParticipant={otherParticipant}
        />
      );
    });

    return elements;
  };

  const scrollToPinned = () => {
    toast.info('Scrolling to pinned message is not fully implemented yet.');
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden" style={{ height: 'calc(100vh - 6.5rem)' }}>
      <div className="flex h-full">
        {/* Conversations sidebar */}
        <div className={cn('w-80 shrink-0 border-r border-border flex flex-col', conversationId ? 'hidden md:flex' : 'flex')}>
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-foreground">Messages</h2>
              <button
                onClick={() => setShowGroupModal(true)}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                title="Create Group Chat"
              >
                <Users className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={convSearch}
                onChange={(e) => setConvSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                aria-label="Search conversations"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isConvsLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))
              : filteredConversations.map((conv) => (
                  <ConversationItem
                    key={conv._id}
                    conversation={conv}
                    isActive={conv._id === conversationId}
                    onClick={() => navigate(`/messages/${conv._id}`)}
                  />
                ))}

            {!isConvsLoading && filteredConversations.length === 0 && (
              <div className="text-center py-12">
                <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {convSearch ? 'No conversations match your search' : 'No conversations yet'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Message area */}
        {conversationId ? (
          <div className="flex-1 flex flex-col min-w-0 relative">
            {/* Calling Overlay */}
            {activeCallState && (
              <div className="absolute inset-0 bg-background/95 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
                {/* Pulsing rings avatar wrapper */}
                <div className="relative mb-6 flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.25, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute h-32 w-32 rounded-full bg-primary/10 border border-primary/20"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.45, 1] }}
                    transition={{ repeat: Infinity, duration: 2, delay: 0.5, ease: "easeInOut" }}
                    className="absolute h-32 w-32 rounded-full bg-primary/5 border border-primary/10"
                  />
                  <Avatar src={otherParticipant?.avatar} name={otherParticipant?.name} size="2xl" className="relative z-10 border-4 border-primary" />
                </div>
                
                <h4 className="font-semibold text-foreground text-base mb-1">{otherParticipant?.name}</h4>
                
                {activeCallState.status === 'incoming' ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-8">Incoming {activeCallState.type === 'Audio' ? 'voice' : 'video'} call...</p>
                    <div className="flex items-center gap-6">
                      <button
                        onClick={declineCall}
                        className="h-14 w-14 rounded-full bg-destructive hover:bg-destructive/90 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer"
                        title="Decline"
                      >
                        <PhoneOff className="h-6 w-6" />
                      </button>
                      <button
                        onClick={acceptCall}
                        className="h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer"
                        title="Accept"
                      >
                        <Phone className="h-6 w-6" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-8">
                      {activeCallState.status === 'ringing' 
                        ? `Ringing (${activeCallState.type === 'Audio' ? 'Audio' : 'Video'})...` 
                        : `Connected • ${formatDuration(activeCallState.duration)}`
                      }
                    </p>

                    {activeCallState.type === 'Video' && activeCallState.status === 'connected' && (
                      <div className="w-64 h-36 rounded-xl overflow-hidden border border-border mb-6 bg-muted relative shadow-lg">
                        <div className="absolute bottom-2 right-2 w-16 h-10 rounded bg-background/80 border border-border overflow-hidden text-[8px] flex items-center justify-center text-muted-foreground select-none z-10">
                          You
                        </div>
                        <img src={otherParticipant?.avatar} alt={otherParticipant?.name} className="w-full h-full object-cover filter blur-[0.5px]" />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent flex items-end p-2.5">
                          <p className="text-xs text-white font-medium">{otherParticipant?.name}</p>
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={endCall}
                      className="h-14 w-14 rounded-full bg-destructive hover:bg-destructive/90 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer"
                      title="End Call"
                    >
                      <PhoneOff className="h-6 w-6" />
                    </button>
                  </>
                )}
              </div>
            )}
            {/* Chat header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => navigate('/messages')} className="md:hidden mr-1 shrink-0 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                {activeConversation && (
                  <>
                    <Avatar
                      src={isGroup ? activeConversation.groupAvatar : otherParticipant?.avatar}
                      name={isGroup ? activeConversation.groupName : otherParticipant?.name}
                      size="md"
                      isOnline={chatHeaderIsOnline}
                    />
                    <div className="min-w-0 text-left">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {isGroup ? activeConversation.groupName : otherParticipant?.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {isGroup 
                          ? `${activeConversation.participants?.length || 0} members: ${activeConversation.participants?.map(p => p.name).join(', ')}`
                          : (chatHeaderIsOnline ? '🟢 Online' : 'Offline')}
                      </p>
                    </div>
                  </>
                )}
              </div>
              
              {/* Call Actions */}
              {otherParticipant && (
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleCall('Phone')} className="h-9 w-9 flex items-center justify-center rounded-full bg-accent text-foreground hover:bg-accent/80 transition-colors" title="Audio Call">
                    <Phone className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleCall('Video')} className="h-9 w-9 flex items-center justify-center rounded-full bg-accent text-foreground hover:bg-accent/80 transition-colors" title="Video Call">
                    <Video className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Pinned Message Banner */}
            {pinnedMessage && (
              <div 
                className="bg-primary/5 border-b border-primary/20 p-3 flex items-start gap-3 cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={scrollToPinned}
              >
                <Pin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-primary mb-0.5">Pinned Message</p>
                  <p className="text-xs text-foreground truncate">{pinnedMessage.content}</p>
                </div>
              </div>
            )}

            {/* Messages */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Infinite Scroll trigger */}
              <div ref={loadMoreRef} className="h-4 w-full flex items-center justify-center">
                {isFetchingNextPage && <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
              </div>

              {isMsgsLoading && allMessages.length === 0 ? (
                <div className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className={cn('h-10 rounded-2xl', i % 2 === 0 ? 'w-48' : 'w-64 ml-auto')} />
                  ))}
                </div>
              ) : (
                renderMessages()
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="flex flex-col border-t border-border bg-card p-4">
              {/* File Preview */}
              {previewUrl && (
                <div className="relative mb-3 self-start">
                  <div className="relative rounded-xl overflow-hidden border border-border h-24 w-auto min-w-[96px] inline-flex items-center justify-center bg-muted">
                    {selectedFile?.type.startsWith('video/') ? (
                      <video src={previewUrl} className="h-full w-auto object-contain" />
                    ) : selectedFile?.type.startsWith('image/') ? (
                      <img src={previewUrl} alt="Preview" className="h-full w-auto object-cover" />
                    ) : selectedFile?.type.startsWith('audio/') ? (
                      <audio src={previewUrl} controls className="h-10 px-2" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 p-4">
                        <Paperclip className="h-8 w-8 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground max-w-[120px] truncate">{selectedFile?.name}</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={cancelAttachment}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors shadow-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip" 
                />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()} 
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors" 
                  aria-label="Attach file"
                  title="Gửi ảnh/Tệp"
                >
                  <Paperclip className="h-5 w-5" />
                </button>

                {/* Emoji Picker Popover */}
                <Popover.Root>
                  <Popover.Trigger asChild>
                    <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground transition-colors" aria-label="Add emoji" title="Chọn biểu cảm">
                      <Smile className="h-5 w-5" />
                    </button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content 
                      className="z-50 w-64 p-3 bg-card border border-border rounded-xl shadow-xl outline-none"
                      sideOffset={5}
                      align="end"
                    >
                      <div className="grid grid-cols-4 gap-2">
                        {EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setMessage(m => m + emoji)}
                            className="h-10 w-10 flex items-center justify-center text-xl hover:bg-accent rounded-lg transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <Popover.Arrow className="fill-border" />
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              
                <div className="flex-1 relative">
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full h-10 px-4 rounded-full bg-muted text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    aria-label="Message input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={(!message.trim() && !selectedFile) || sendMessageMutation.isPending}
                  className="shrink-0 h-10 px-4 flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm font-semibold"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                  <span>Gửi</span>
                </button>
              </form>
          </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Select a conversation</h3>
            <p className="text-muted-foreground text-sm">Choose from your existing conversations or start a new one</p>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <Modal
        open={showGroupModal}
        onOpenChange={setShowGroupModal}
        title="Create Group Chat"
        description="Select friends to invite to a new group conversation."
      >
        <form onSubmit={handleCreateGroup} className="space-y-4 text-left">
          <Input
            label="Group Name"
            placeholder="e.g. Project Team, Chill Club..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
            autoFocus
          />

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Select Friends ({selectedMembers.length})
            </label>
            <div className="max-h-60 overflow-y-auto border border-border rounded-xl p-2 space-y-1 bg-muted/20">
              {isFriendsLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">Loading friends...</div>
              ) : friends.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No friends found to invite.</div>
              ) : (
                friends.map((friend) => {
                  const isSelected = selectedMembers.includes(friend._id);
                  return (
                    <label
                      key={friend._id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar src={friend.avatar} name={friend.name} size="sm" />
                        <div>
                          <p className="text-sm font-semibold text-foreground leading-none">{friend.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">@{friend.username}</p>
                        </div>
                      </div>
                      <div className={cn(
                        "h-5 w-5 rounded-full border flex items-center justify-center transition-all",
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                      )}>
                        {isSelected && <Check className="h-3 w-3 stroke-[3px]" />}
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedMembers((prev) =>
                            isSelected
                              ? prev.filter((id) => id !== friend._id)
                              : [...prev, friend._id]
                          );
                        }}
                        className="sr-only"
                      />
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowGroupModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              disabled={!groupName.trim() || selectedMembers.length < 1 || createGroupMutation.isPending}
              isLoading={createGroupMutation.isPending}
            >
              Create Group
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
