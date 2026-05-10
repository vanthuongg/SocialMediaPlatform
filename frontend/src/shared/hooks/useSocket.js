import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import { useSocketStore } from '@/shared/stores/socket.store.js';
import { useChatStore } from '@/shared/stores/chat.store.js';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/shared/hooks/useToast.js';
import api from '@/shared/api/axios.instance.js';

/**
 * Initializes Socket.IO connection when the user is authenticated.
 * Handles connection lifecycle, events, and cleanup.
 */
export function useSocket() {
  const { accessToken, isAuthenticated } = useAuthStore();
  const { setSocket, setConnected, disconnect, addOnlineUser, removeOnlineUser } = useSocketStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !accessToken || accessToken === 'mock_token') return;

    const socket = io(import.meta.env.VITE_SOCKET_URL || '/', {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      setConnected(true);
      setSocket(socket);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    // Real-time notifications
    socket.on('notification:new', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    });

    const playNotificationSound = () => {
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
        audio.volume = 0.4;
        audio.play();
      } catch (err) {
        console.warn('Failed to play notification sound:', err);
      }
    };

    // Real-time messages
    socket.on('message:new', ({ conversationId, message }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      const currentUserId = useAuthStore.getState().user?._id;
      if (message && message.sender?._id !== currentUserId) {
        const pathParts = window.location.pathname.split('/');
        const isMessagesPage = pathParts[1] === 'messages';
        const activeConversationId = isMessagesPage ? pathParts[2] : null;
        const isChatActive = activeConversationId === conversationId && !document.hidden;

        if (!isChatActive) {
          playNotificationSound();
          toast.info(`${message.sender.name}: ${message.content || 'Đã gửi một tệp đính kèm'}`);
        }
      }
    });

    // Online status
    socket.on('user:online', (userId) => {
      addOnlineUser(userId);
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    });

    socket.on('user:offline', (userId) => {
      removeOnlineUser(userId);
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    });

    // Real-time read receipts
    socket.on('message:read', ({ conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['popup-messages', conversationId] });
      // Invalidate conversations so the unread badge on the header icon updates immediately
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    const saveCallLog = (conversationId, type, status, duration, role) => {
      if (role !== 'caller') return;
      const isVideo = type === 'Video';
      const icon = isVideo ? '📹' : '📞';
      const content = status === 'connected'
        ? `${icon} Cuộc gọi đi (${Math.floor(duration / 60).toString().padStart(2, '0')}:${(duration % 60).toString().padStart(2, '0')})`
        : `${icon} Cuộc gọi nhỡ`;

      api.post(`/messages/conversations/${conversationId}/messages`, { content })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
          queryClient.invalidateQueries({ queryKey: ['popup-messages', conversationId] });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        })
        .catch((err) => console.error('Failed to save call log:', err));
    };

    // Call signaling events
    socket.on('call:incoming', ({ conversationId, caller, type }) => {
      useChatStore.getState().openChat(conversationId, caller);
      useChatStore.getState().setActiveCall(conversationId, {
        type,
        role: 'receiver',
        status: 'incoming',
        participant: caller,
        duration: 0
      });
    });

    socket.on('call:accepted', ({ conversationId }) => {
      const activeCall = useChatStore.getState().activeCalls[conversationId];
      if (activeCall) {
        useChatStore.getState().setActiveCall(conversationId, {
          ...activeCall,
          status: 'connected',
        });
      }
    });

    socket.on('call:declined', ({ conversationId }) => {
      const activeCall = useChatStore.getState().activeCalls[conversationId];
      if (activeCall) {
        toast.warning(`Cuộc gọi bị từ chối bởi ${activeCall.participant?.name}`);
        saveCallLog(conversationId, activeCall.type, activeCall.status, activeCall.duration, activeCall.role);
        useChatStore.getState().clearActiveCall(conversationId);
      }
    });

    socket.on('call:ended', ({ conversationId }) => {
      const activeCall = useChatStore.getState().activeCalls[conversationId];
      if (activeCall) {
        toast.info(`Cuộc gọi với ${activeCall.participant?.name} đã kết thúc`);
        saveCallLog(conversationId, activeCall.type, activeCall.status, activeCall.duration, activeCall.role);
        useChatStore.getState().clearActiveCall(conversationId);
      }
    });

    return () => {
      socket.off('notification:new');
      socket.off('message:new');
      socket.off('message:read');
      socket.off('user:online');
      socket.off('user:offline');
      socket.off('call:incoming');
      socket.off('call:accepted');
      socket.off('call:declined');
      socket.off('call:ended');
      socket.disconnect();
      disconnect();
    };
  }, [isAuthenticated, accessToken]);

  return useSocketStore();
}
