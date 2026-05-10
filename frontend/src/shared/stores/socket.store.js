import { create } from 'zustand';

export const useSocketStore = create((set, get) => ({
  socket: null,
  isConnected: false,
  onlineUsers: new Set(),

  setSocket: (socket) => set({ socket }),
  setConnected: (isConnected) => set({ isConnected }),
  addOnlineUser: (userId) =>
    set((state) => ({ onlineUsers: new Set([...state.onlineUsers, userId]) })),
  removeOnlineUser: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUsers);
      next.delete(userId);
      return { onlineUsers: next };
    }),
  isUserOnline: (userId) => get().onlineUsers.has(userId),

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, onlineUsers: new Set() });
    }
  },
}));
