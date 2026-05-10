import { create } from 'zustand';

/**
 * Chat popup store — manages open mini chat windows (like Facebook Messenger).
 * Supports up to MAX_OPEN windows open simultaneously.
 */
const MAX_OPEN = 3;

export const useChatStore = create((set, get) => ({
  // Array of open chat windows: [{ conversationId, participant }]
  openChats: [],

  // Whether the conversations dropdown in navbar is open
  isDropdownOpen: false,

  // Call states: { [conversationId]: { type, role, status, participant, duration } }
  activeCalls: {},

  // Custom nicknames mapping: { [userId]: nickname }
  nicknames: {},

  setNickname: (userId, nickname) =>
    set((state) => ({
      nicknames: {
        ...state.nicknames,
        [userId]: nickname,
      },
    })),

  setActiveCall: (conversationId, callState) =>
    set((state) => ({
      activeCalls: {
        ...state.activeCalls,
        [conversationId]: callState,
      },
    })),

  clearActiveCall: (conversationId) =>
    set((state) => {
      const next = { ...state.activeCalls };
      delete next[conversationId];
      return { activeCalls: next };
    }),

  openChat: (conversationId, participant) => {
    const { openChats } = get();
    // If already open, just bring to front (move to end)
    if (openChats.find((c) => c.conversationId === conversationId)) {
      set({
        openChats: [
          ...openChats.filter((c) => c.conversationId !== conversationId),
          { conversationId, participant },
        ],
        isDropdownOpen: false,
      });
      return;
    }
    // Cap at MAX_OPEN — remove oldest
    const updated = openChats.length >= MAX_OPEN ? openChats.slice(1) : openChats;
    set({ openChats: [...updated, { conversationId, participant }], isDropdownOpen: false });
  },

  closeChat: (conversationId) =>
    set((state) => {
      const nextCalls = { ...state.activeCalls };
      delete nextCalls[conversationId];
      return {
        openChats: state.openChats.filter((c) => c.conversationId !== conversationId),
        activeCalls: nextCalls,
      };
    }),

  setDropdownOpen: (open) => set({ isDropdownOpen: open }),
  toggleDropdown: () => set((state) => ({ isDropdownOpen: !state.isDropdownOpen })),
}));
