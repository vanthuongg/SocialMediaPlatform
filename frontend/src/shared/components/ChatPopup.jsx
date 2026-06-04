import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Minus, Smile, Paperclip, Phone, Video, Pin, PinOff, PhoneOff, Info, ChevronLeft } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { useInView } from 'react-intersection-observer';
import api from '@/shared/api/axios.instance.js';
import Avatar from '@/shared/components/Avatar.jsx';
import { Skeleton } from '@/shared/components/Skeleton.jsx';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import { useSocketStore } from '@/shared/stores/socket.store.js';
import { useChatStore } from '@/shared/stores/chat.store.js';
import { cn } from '@/shared/utils/cn.js';
import { formatTime } from '@/shared/utils/formatters.js';
import { toast } from '@/shared/hooks/useToast.js';

const EMOJIS = ['😀','😂','🥰','😎','😭','😡','👍','❤️','🔥','✨','🎉','🙌','🤔','👀','💯','🙏'];

function Bubble({ message, isOwn, onTogglePin }) {
  return (
    <div className={cn('flex gap-1.5 items-end max-w-[80%] group', isOwn ? 'ml-auto flex-row-reverse' : '')}>
      {!isOwn && (
        <Avatar src={message.sender?.avatar} name={message.sender?.name} size="xs" className="shrink-0 mb-1" />
      )}
      <div className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
        {message.isPinned && (
          <div className="flex items-center gap-1 text-[10px] text-primary mb-0.5 px-1 font-semibold">
            <Pin className="h-2.5 w-2.5" /> Pinned
          </div>
        )}
        <div className="flex items-center gap-1.5">
          {isOwn && (
            <button
              onClick={() => onTogglePin(message)}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground"
            >
              {message.isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
            </button>
          )}
          <div className={cn(
            'px-3 py-1.5 rounded-2xl text-sm leading-relaxed',
            isOwn ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'
          )}>
            {message.media && (
              <div className="mb-1.5 rounded-lg overflow-hidden max-w-[180px]">
                {message.media.type === 'image'
                  ? <img src={message.media.url} alt="Attachment" className="w-full h-auto rounded-md" />
                  : <a href={message.media.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs p-2 bg-background/20 rounded-md">
                      <Paperclip className="h-3 w-3" /> {message.media.fileName || 'File'}
                    </a>
                }
              </div>
            )}
            {message.content}
            <p className={cn('text-[10px] mt-0.5', isOwn ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground')}>
              {formatTime(message.createdAt)}
            </p>
          </div>
          {!isOwn && (
            <button
              onClick={() => onTogglePin(message)}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground"
            >
              {message.isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatDetailsPanel({ participant, allMessages, nicknames, setNickname, onClose }) {
  const [editingNickname, setEditingNickname] = useState(nicknames[participant?._id] || '');
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveNickname = (e) => {
    e.preventDefault();
    setNickname(participant?._id, editingNickname.trim());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const sharedImages = useMemo(() => {
    return allMessages
      .filter((msg) => msg.media && msg.media.type === 'image')
      .map((msg) => msg.media.url);
  }, [allMessages]);

  const callLogs = useMemo(() => {
    return allMessages
      .filter((msg) => msg.content && (msg.content.includes('📞') || msg.content.includes('📹')))
      .map((msg) => ({
        id: msg._id,
        content: msg.content,
        createdAt: msg.createdAt,
      }));
  }, [allMessages]);

  return (
    <div className="flex flex-col h-full bg-card text-foreground select-none">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
        <button
          onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chi tiết hội thoại</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-hide text-left">
        <div className="flex flex-col items-center text-center pb-2 border-b border-border/50">
          <Avatar src={participant?.avatar} name={participant?.name} size="lg" className="mb-2" />
          <h5 className="font-bold text-sm text-foreground">{nicknames[participant?._id] || participant?.name}</h5>
          {nicknames[participant?._id] && (
            <p className="text-[10px] text-muted-foreground mt-0.5">Tên thật: {participant?.name}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Biệt danh</label>
          <form onSubmit={handleSaveNickname} className="flex gap-1.5">
            <input
              value={editingNickname}
              onChange={(e) => setEditingNickname(e.target.value)}
              placeholder="Đặt biệt danh..."
              className="flex-1 h-7 px-2.5 rounded bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-ring border border-border"
            />
            <button
              type="submit"
              className="h-7 px-3 bg-primary text-primary-foreground text-xs rounded font-medium hover:bg-primary/90 transition-colors"
            >
              {isSaved ? 'Đã lưu' : 'Lưu'}
            </button>
          </form>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Ảnh đã chia sẻ ({sharedImages.length})
          </label>
          {sharedImages.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">Chưa có hình ảnh chia sẻ</p>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {sharedImages.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square rounded-md overflow-hidden border border-border bg-muted hover:opacity-85 transition-opacity"
                >
                  <img src={url} alt="Shared media" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Lịch sử cuộc gọi ({callLogs.length})
          </label>
          {callLogs.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">Chưa có cuộc gọi nào</p>
          ) : (
            <div className="space-y-1 border border-border rounded-lg p-2 bg-muted/40 max-h-36 overflow-y-auto scrollbar-hide">
              {callLogs.map((log) => (
                <div key={log.id} className="flex flex-col text-[11px] py-1 border-b border-border/30 last:border-b-0">
                  <span className="font-medium text-foreground">{log.content}</span>
                  <span className="text-[9px] text-muted-foreground mt-0.5">
                    {formatTime(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SingleChatWindow({ conversationId, participant, index, total }) {
  const { user: currentUser } = useAuthStore();
  const isUserOnline = useSocketStore((s) => s.isUserOnline);
  const closeChat = useChatStore((s) => s.closeChat);
  const socket = useSocketStore((s) => s.socket);
  const qc = useQueryClient();

  const [minimized, setMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatBodyRef = useRef(null);
  const { ref: loadMoreRef, inView } = useInView();

  const [unreadCount, setUnreadCount] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  const activeCallState = useChatStore((s) => s.activeCalls[conversationId]);
  const setActiveCallGlobal = useChatStore((s) => s.setActiveCall);
  const clearActiveCallGlobal = useChatStore((s) => s.clearActiveCall);
  
  const nicknames = useChatStore((s) => s.nicknames);
  const setNickname = useChatStore((s) => s.setNickname);
  const participantNickname = nicknames[participant?._id] || participant?.name;

  const isGroup = participant?.isGroup;
  const isOnline = !isGroup && (participant?.isOnline || isUserOnline(participant?._id));

  // Reset unread count when window is maximized/expanded
  useEffect(() => {
    if (!minimized) {
      setUnreadCount(0);
    }
  }, [minimized]);

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

  const startCall = (type) => {
    const callPayload = { type, role: 'caller', status: 'ringing', participant, duration: 0 };
    setActiveCallGlobal(conversationId, callPayload);
    toast.info(`Đang gọi ${participant?.name}...`);
    
    if (socket) {
      socket.emit('call:start', {
        conversationId,
        targetUserId: participant?._id,
        type,
      });
    }
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

  // Messages infinite query — backend marks messages as read on GET, so invalidate conversations after load
  const qcRef = useRef(qc);
  qcRef.current = qc;

  const { data: msgsData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['popup-messages', conversationId],
    queryFn: ({ pageParam = null }) =>
      api.get(`/messages/conversations/${conversationId}`, { params: { cursor: pageParam } }).then((r) => {
        // Backend marks messages as read on fetch — refresh conversations badge
        qcRef.current.invalidateQueries({ queryKey: ['conversations'] });
        return r.data.data;
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled: !!conversationId && !minimized,
  });

  // Load more when sentinel visible
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      const h = chatBodyRef.current?.scrollHeight;
      fetchNextPage().then(() => {
        if (chatBodyRef.current && h) {
          chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight - h;
        }
      });
    }
  }, [inView, hasNextPage, isFetchingNextPage]);

  const allMessages = useMemo(() => {
    if (!msgsData) return [];
    return [...msgsData.pages].reverse().flatMap((p) => p.messages);
  }, [msgsData]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!minimized) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }, [allMessages.length, minimized]);

  // Real-time socket
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      if (data.conversationId === conversationId) {
        qc.invalidateQueries({ queryKey: ['popup-messages', conversationId] });
        qc.invalidateQueries({ queryKey: ['conversations'] });

        // Increment unread count if minimized and incoming message from other participant
        if (minimized && data.message && data.message.sender?._id !== currentUser?._id) {
          setUnreadCount((c) => c + 1);
        }
      }
    };
    socket.on('message:new', handler);
    socket.on('message:update', handler);

    // Refresh conversations unread badge when messages are read
    const readHandler = (data) => {
      if (data.conversationId === conversationId) {
        qc.invalidateQueries({ queryKey: ['conversations'] });
      }
    };
    socket.on('message:read', readHandler);

    return () => {
      socket.off('message:new', handler);
      socket.off('message:update', handler);
      socket.off('message:read', readHandler);
    };
  }, [socket, conversationId, qc, minimized, currentUser?._id]);

  const sendMutation = useMutation({
    mutationFn: (payload) => {
      const config = payload instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
      return api.post(`/messages/conversations/${conversationId}/messages`, payload, config);
    },
    onSuccess: () => {
      setMessage('');
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      qc.invalidateQueries({ queryKey: ['popup-messages', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const pinMutation = useMutation({
    mutationFn: (msg) => api.patch(`/messages/conversations/${conversationId}/messages/${msg._id}/pin`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['popup-messages', conversationId] }),
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim() && !selectedFile) return;
    if (selectedFile) {
      const fd = new FormData();
      if (message.trim()) fd.append('content', message.trim());
      fd.append('media', selectedFile);
      sendMutation.mutate(fd);
    } else {
      sendMutation.mutate({ content: message.trim() });
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error('File must be less than 10MB');
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Positioning: stack from right, each 288px wide + 8px gap
  const RIGHT_BASE = 16;
  const WIDTH = 288;
  const GAP = 8;
  const right = RIGHT_BASE + index * (WIDTH + GAP);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      className="fixed bottom-0 z-50 flex flex-col rounded-t-2xl border border-border border-b-0 bg-card shadow-2xl overflow-hidden"
      style={{ width: WIDTH, right }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 bg-card border-b border-border cursor-pointer select-none"
        onClick={() => setMinimized((v) => !v)}
      >
        <div className="relative shrink-0">
          <Avatar src={participant?.avatar} name={participant?.name} size="sm" />
          {isOnline && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />}
        </div>
        <div className="flex-1 min-w-0 flex items-center justify-between gap-1.5">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate leading-tight">{participantNickname}</p>
            <p className={cn('text-[11px] leading-tight', isOnline ? 'text-emerald-500' : 'text-muted-foreground')}>
              {isGroup ? 'Group Chat' : (isOnline ? 'Active now' : 'Offline')}
            </p>
          </div>
          {minimized && unreadCount > 0 && (
            <span className="shrink-0 h-5 min-w-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 animate-pulse">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {!isGroup && (
            <>
              <button
                onClick={() => startCall('Audio')}
                className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Gọi thoại"
              >
                <Phone className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => startCall('Video')}
                className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Gọi video"
              >
                <Video className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  setMinimized(false);
                  setShowDetails((v) => !v);
                }}
                className={cn(
                  "h-6 w-6 flex items-center justify-center rounded-full transition-colors",
                  showDetails ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground hover:text-foreground"
                )}
                title="Chi tiết cuộc trò chuyện"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <button
            onClick={() => setMinimized((v) => !v)}
            className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => closeChat(conversationId)}
            className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Body — collapsible */}
      <AnimatePresence initial={false}>
        {!minimized && (
          <motion.div
            key="body"
            initial={{ height: 0 }}
            animate={{ height: 360 }}
            exit={{ height: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="flex flex-col overflow-hidden relative"
            style={{ height: 360 }}
          >
            {/* Details Panel */}
            {showDetails ? (
              <ChatDetailsPanel
                participant={participant}
                allMessages={allMessages}
                nicknames={nicknames}
                setNickname={setNickname}
                onClose={() => setShowDetails(false)}
              />
            ) : (
              <>
                {/* Calling Overlay */}
                {activeCallState && (
                  <div className="absolute inset-0 bg-background/95 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
                    {/* Pulsing rings avatar wrapper */}
                    <div className="relative mb-6 flex items-center justify-center">
                      <motion.div
                        animate={{ scale: [1, 1.25, 1] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="absolute h-24 w-24 rounded-full bg-primary/10 border border-primary/20"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.45, 1] }}
                        transition={{ repeat: Infinity, duration: 2, delay: 0.5, ease: "easeInOut" }}
                        className="absolute h-24 w-24 rounded-full bg-primary/5 border border-primary/10"
                      />
                      <Avatar src={participant?.avatar} name={participant?.name} size="xl" className="h-16 w-16 relative z-10 border-2 border-primary" />
                    </div>
                    
                    <h4 className="font-semibold text-foreground text-sm mb-1">{participantNickname}</h4>
                    
                    {activeCallState.status === 'incoming' ? (
                      <>
                        <p className="text-xs text-muted-foreground mb-8">Cuộc gọi {activeCallState.type === 'Audio' ? 'thoại' : 'video'} đến...</p>
                        <div className="flex items-center gap-6">
                          <button
                            onClick={declineCall}
                            className="h-12 w-12 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground flex items-center justify-center shadow-lg transition-transform hover:scale-105"
                            title="Từ chối"
                          >
                            <PhoneOff className="h-5 w-5" />
                          </button>
                          <button
                            onClick={acceptCall}
                            className="h-12 w-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
                            title="Chấp nhận"
                          >
                            <Phone className="h-5 w-5" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground mb-8">
                          {activeCallState.status === 'ringing' 
                            ? `Đang đổ chuông (${activeCallState.type === 'Audio' ? 'Audio' : 'Video'})...` 
                            : `Đang kết nối • ${formatDuration(activeCallState.duration)}`
                          }
                        </p>

                        {/* Video window placeholder if Video Call is connected */}
                        {activeCallState.type === 'Video' && activeCallState.status === 'connected' && (
                          <div className="w-48 h-28 rounded-lg overflow-hidden border border-border mb-6 bg-muted relative">
                            {/* Mock local camera view */}
                            <div className="absolute bottom-1 right-1 w-12 h-8 rounded bg-background/80 border border-border overflow-hidden text-[6px] flex items-center justify-center text-muted-foreground select-none z-10">
                              Bạn
                            </div>
                            {/* Mock remote video feed */}
                            <img src={participant?.avatar} alt={participant?.name} className="w-full h-full object-cover filter blur-[0.5px]" />
                            <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent flex items-end p-1.5">
                              <p className="text-[10px] text-white font-medium">{participantNickname}</p>
                            </div>
                          </div>
                        )}
                        
                        <button
                          onClick={endCall}
                          className="h-12 w-12 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground flex items-center justify-center shadow-lg transition-transform hover:scale-105"
                          title="Gác máy"
                        >
                          <PhoneOff className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Messages area */}
                <div ref={chatBodyRef} className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide" style={{ height: 300 }}>
                  {/* Load more sentinel */}
                  <div ref={loadMoreRef} className="h-2 flex items-center justify-center">
                    {isFetchingNextPage && <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
                  </div>

                  {isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className={cn('h-8 rounded-2xl', i % 2 === 0 ? 'w-36' : 'w-44 ml-auto')} />
                      ))}
                    </div>
                  ) : allMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-xs text-muted-foreground text-center">Say hi to {participantNickname}! 👋</p>
                    </div>
                  ) : (
                    (() => {
                      const elements = [];
                      let lastDate = null;
                      allMessages.forEach((msg) => {
                        if (msg.createdAt) {
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
                              <div key={`date-header-${msg._id}`} className="flex justify-center my-3 select-none">
                                <span className="text-[10px] font-bold text-muted-foreground/80 bg-accent/60 px-2.5 py-0.5 rounded-full border border-border/30 shadow-sm">
                                  {headerText}
                                </span>
                              </div>
                            );
                          }
                        }
                        elements.push(
                          <Bubble
                            key={msg._id}
                            message={msg}
                            isOwn={msg.sender?._id === currentUser?._id}
                            onTogglePin={(m) => pinMutation.mutate(m)}
                          />
                        );
                      });
                      return elements;
                    })()
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* File preview */}
                {previewUrl && (
                  <div className="px-3 pb-1 relative self-start">
                    <div className="relative inline-flex items-center justify-center rounded-lg overflow-hidden border border-border h-16 bg-muted">
                      {selectedFile?.type.startsWith('image/')
                        ? <img src={previewUrl} alt="Preview" className="h-full w-auto object-cover" />
                        : <div className="flex items-center gap-1 p-2 text-xs text-muted-foreground"><Paperclip className="h-3 w-3" />{selectedFile?.name}</div>
                      }
                    </div>
                    <button
                      onClick={() => { setSelectedFile(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                )}

                {/* Input bar */}
                <div className="border-t border-border px-2 py-2">
                  <form onSubmit={handleSend} className="flex items-center gap-1">
                    <input type="file" ref={fileInputRef} onChange={handleFile} className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      title="Gửi ảnh/Tệp"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                    </button>

                    {/* Emoji */}
                    <Popover.Root>
                      <Popover.Trigger asChild>
                        <button type="button" className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Chọn biểu cảm">
                          <Smile className="h-3.5 w-3.5" />
                        </button>
                      </Popover.Trigger>
                      <Popover.Portal>
                        <Popover.Content className="z-50 w-52 p-2 bg-card border border-border rounded-xl shadow-xl outline-none" sideOffset={5} align="end">
                          <div className="grid grid-cols-4 gap-1">
                            {EMOJIS.map((emoji) => (
                              <button key={emoji} type="button" onClick={() => setMessage((m) => m + emoji)}
                                className="h-9 w-9 flex items-center justify-center text-lg hover:bg-accent rounded-lg transition-colors">
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </Popover.Content>
                      </Popover.Portal>
                    </Popover.Root>

                    <input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Aa"
                      className="flex-1 min-w-0 h-8 px-3 rounded-full bg-muted text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      aria-label="Message"
                    />

                    <button
                      type="submit"
                      disabled={(!message.trim() && !selectedFile) || sendMutation.isPending}
                      className="shrink-0 h-8 px-3 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 text-xs font-semibold"
                    >
                      Gửi
                    </button>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ChatPopupManager() {
  const openChats = useChatStore((s) => s.openChats);

  return (
    <AnimatePresence>
      {openChats.map((chat, i) => (
        <SingleChatWindow
          key={chat.conversationId}
          conversationId={chat.conversationId}
          participant={chat.participant}
          index={i}
          total={openChats.length}
        />
      ))}
    </AnimatePresence>
  );
}
