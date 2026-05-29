// [auto] Top navigation bar
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Bell, MessageCircle, Plus, Sun, Moon, LogOut,
  Settings, User, ChevronDown, X, FileText, Hash, Users, Command
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import { useTheme } from '@/shared/hooks/useTheme.js';
import { useAuth } from '@/shared/hooks/useAuth.js';
import { useChatStore } from '@/shared/stores/chat.store.js';
import { useQuery } from '@tanstack/react-query';
import { MessagesPanel } from '../MessagesDropdown.jsx';
import NotificationsDropdown from '../NotificationsDropdown.jsx';
import Avatar from '../Avatar.jsx';
import { Skeleton } from '../Skeleton.jsx';
import Modal from '../Modal.jsx';
import PostEditor from '@/features/posts/components/PostEditor.jsx';
import { cn } from '@/shared/utils/cn.js';
import api from '@/shared/api/axios.instance.js';
import { useSearchHistory } from '@/features/search/hooks/useSearchHistory.js';

// Live search dropdown component
function LiveSearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const debounceRef = useRef(null);
  const { history, addSearch, removeSearch, clearAll } = useSearchHistory();

  // Debounce input
  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(val.trim());
    }, 350);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (!inputRef.current?.contains(e.target) && !panelRef.current?.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard handlers
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
    if (e.key === 'Enter' && query.trim()) {
      setIsOpen(false);
      addSearch({ type: 'text', query: query.trim() });
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }, [query, navigate, addSearch]);

  const { data, isLoading } = useQuery({
    queryKey: ['navbar-search', debouncedQuery],
    queryFn: () =>
      api.get('/search', { params: { q: debouncedQuery, limit: 5 } }).then((r) => r.data.data),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  const users = data?.users?.slice(0, 4) || [];
  const groups = data?.groups?.slice(0, 4) || [];
  const posts = data?.posts?.slice(0, 2) || [];
  const hasResults = users.length > 0 || groups.length > 0 || posts.length > 0;
  const showPanel = isOpen && (debouncedQuery.length >= 2 || history.length > 0);

  const handleSelect = (path, item = null) => {
    if (item) {
      addSearch(item);
    }
    setIsOpen(false);
    setQuery('');
    setDebouncedQuery('');
    navigate(path);
  };

  const clearSearch = () => {
    setQuery('');
    setDebouncedQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex-1 max-w-sm hidden sm:block relative">
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search Nova..."
          value={query}
          onChange={handleChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          aria-label="Search Nova"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          className={cn(
            'w-full h-10 pl-10 pr-9 rounded-full text-sm placeholder:text-muted-foreground/60 transition-all duration-200',
            'bg-muted/60 border border-border/50 backdrop-blur-sm',
            'focus:outline-none focus:bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/20 shadow-xs',
            query ? 'pr-8' : 'pr-12'
          )}
        />
        {!query && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-semibold text-muted-foreground border border-border/50 pointer-events-none select-none">
            <Command className="h-2.5 w-2.5" /> K
          </div>
        )}
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground transition-colors rounded-full"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-white/20 dark:border-white/10 bg-card/95 backdrop-blur-2xl shadow-2xl shadow-primary/10 overflow-hidden z-50"
          >
            {debouncedQuery.length < 2 ? (
              // Recent Searches
              <div className="p-2">
                <div className="flex items-center justify-between px-3 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    Recent Searches
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAll();
                    }}
                    className="text-[11px] font-semibold text-primary hover:underline transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-0.5 max-h-80 overflow-y-auto">
                  {history.map((item, idx) => (
                    <div
                      key={idx}
                      className="group flex items-center justify-between px-3 py-2 rounded-xl hover:bg-accent/80 transition-colors"
                    >
                      <button
                        onClick={() => {
                          if (item.type === 'user') {
                            handleSelect(`/${item.username}`, item);
                          } else if (item.type === 'group') {
                            handleSelect(`/groups/${item.id}`, item);
                          } else {
                            handleSelect(`/search?q=${encodeURIComponent(item.query)}`, item);
                          }
                        }}
                        className="flex-1 flex items-center gap-3 text-left min-w-0"
                      >
                        {item.type === 'user' && (
                          <>
                            <Avatar src={item.avatar} name={item.name} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                              <p className="text-xs text-muted-foreground font-normal">@{item.username}</p>
                            </div>
                          </>
                        )}
                        {item.type === 'group' && (
                          <>
                            <Avatar src={item.avatar} name={item.name} size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                              <p className="text-xs text-muted-foreground font-normal">
                                Group • {item.privacy === 'private' ? 'Private' : 'Public'}
                              </p>
                            </div>
                          </>
                        )}
                        {item.type === 'text' && (
                          <>
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                              <Search className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{item.query}</p>
                              <p className="text-xs text-muted-foreground font-normal">Search query</p>
                            </div>
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          removeSearch(item);
                        }}
                        className="p-1.5 rounded-full text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground transition-colors cursor-pointer"
                        aria-label="Remove search"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : isLoading ? (
              <div className="p-3 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-2.5 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !hasResults ? (
              <div className="py-6 text-center">
                <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No results for "{debouncedQuery}"</p>
              </div>
            ) : (
              <div>
                {/* People */}
                {users.length > 0 && (
                  <div>
                    <p className="px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <User className="h-3 w-3" /> People
                    </p>
                    {users.map((u) => (
                      <button
                        key={u._id}
                        onClick={() =>
                          handleSelect(`/${u.username}`, {
                            type: 'user',
                            id: u._id,
                            name: u.name,
                            username: u.username,
                            avatar: u.avatar,
                          })
                        }
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent/80 transition-colors text-left"
                      >
                        <Avatar src={u.avatar} name={u.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{u.name}</p>
                          <p className="text-xs text-muted-foreground font-normal">@{u.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Groups */}
                {groups.length > 0 && (
                  <div className={cn(users.length > 0 && 'border-t border-border/50')}>
                    <p className="px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3 w-3" /> Groups
                    </p>
                    {groups.map((g) => (
                      <button
                        key={g._id}
                        onClick={() =>
                          handleSelect(`/groups/${g._id}`, {
                            type: 'group',
                            id: g._id,
                            name: g.name,
                            avatar: g.avatar,
                            privacy: g.privacy,
                          })
                        }
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent/80 transition-colors text-left animate-fade-in"
                      >
                        <Avatar src={g.avatar} name={g.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{g.name}</p>
                          <p className="text-xs text-muted-foreground font-normal">
                            Group • {g.privacy === 'private' ? 'Private' : 'Public'} • {g.membersCount || 0} members
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Posts */}
                {posts.length > 0 && (
                  <div className={cn((users.length > 0 || groups.length > 0) && 'border-t border-border/50')}>
                    <p className="px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-3 w-3" /> Posts
                    </p>
                    {posts.map((p) => (
                      <button
                        key={p._id}
                        onClick={() =>
                          handleSelect(`/posts/${p._id}`, {
                            type: 'text',
                            query: p.content?.slice(0, 30) || 'Post',
                          })
                        }
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent/80 transition-colors text-left"
                      >
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{p.content?.slice(0, 60) || 'Post'}</p>
                          <p className="text-xs text-muted-foreground font-normal">by @{p.author?.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* See all */}
                <div className="border-t border-border/50 p-2">
                  <button
                    onClick={() =>
                      handleSelect(`/search?q=${encodeURIComponent(debouncedQuery)}`, {
                        type: 'text',
                        query: debouncedQuery,
                      })
                    }
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm text-primary hover:bg-primary/10 transition-colors font-medium cursor-pointer"
                  >
                    <Search className="h-3.5 w-3.5" />
                    See all results for "{debouncedQuery}"
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Navbar() {
  const { user, accessToken } = useAuthStore();
  const { isDark, toggleTheme } = useTheme();
  const { logoutMutation } = useAuth();
  const navigate = useNavigate();
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  const { isDropdownOpen, toggleDropdown, setDropdownOpen, openChat } = useChatStore();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [msgSearch, setMsgSearch] = useState('');
  const msgPanelRef = useRef(null);
  const msgBtnRef = useRef(null);

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifPanelRef = useRef(null);
  const notifBtnRef = useRef(null);

  const profileMenuRef = useRef(null);
  const profileBtnRef = useRef(null);

  // Unread notification count
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => api.get('/notifications?limit=1').then((r) => r.data.meta?.unreadCount || 0),
    enabled: !!user && !!accessToken,
    refetchInterval: 30000,
  });

  // Conversations for dropdown and unread badge calculation
  const { data: conversationsData, isLoading: convsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/messages/conversations').then((r) => r.data.data.conversations),
    enabled: !!user && !!accessToken,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const unreadMessagesCount = useMemo(() => {
    if (!conversationsData || !user) return 0;
    return conversationsData.filter((c) => {
      if (!c.lastMessage) return false;
      const isSender = typeof c.lastMessage.sender === 'object'
        ? c.lastMessage.sender._id?.toString() === user._id?.toString()
        : c.lastMessage.sender?.toString() === user._id?.toString();
      if (isSender) return false;

      const hasRead = c.lastMessage.readBy?.some((r) => {
        const id = typeof r.user === 'object' ? r.user?._id : r.user;
        return id?.toString() === user._id?.toString();
      });
      return !hasRead;
    }).length;
  }, [conversationsData, user]);

  const conversations = conversationsData || [];
  const filteredConvs = conversations.filter((c) => {
    if (!msgSearch.trim()) return true;
    const other = c.participants.find((p) => p._id !== user?._id);
    return (
      other?.name?.toLowerCase().includes(msgSearch.toLowerCase()) ||
      other?.username?.toLowerCase().includes(msgSearch.toLowerCase())
    );
  });

  // Click outside messages dropdown
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handler = (e) => {
      if (!msgPanelRef.current?.contains(e.target) && !msgBtnRef.current?.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isDropdownOpen, setDropdownOpen]);

  // Click outside notifications dropdown
  useEffect(() => {
    if (!isNotifOpen) return;
    const handler = (e) => {
      if (!notifPanelRef.current?.contains(e.target) && !notifBtnRef.current?.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isNotifOpen]);

  // Click outside profile menu
  useEffect(() => {
    if (!isProfileMenuOpen) return;
    const handler = (e) => {
      if (!profileMenuRef.current?.contains(e.target) && !profileBtnRef.current?.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isProfileMenuOpen]);

  const handleConvClick = (conv, other) => {
    openChat(conv._id, other);
    setMsgSearch('');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 glass border-b border-border/50 shadow-xs backdrop-blur-xl">
      <div className="h-full w-full max-w-full mx-auto px-4 lg:px-8 flex items-center gap-4">
        {/* Logo */}
        <Link to="/feed" className="flex items-center gap-2.5 shrink-0 group">
          <div className="h-9.5 w-9.5 rounded-2xl bg-nova-gradient flex items-center justify-center shadow-md shadow-primary/25 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
            <span className="text-xl font-black text-white tracking-tighter">N</span>
          </div>
          <span className="hidden sm:block text-2xl font-black text-gradient tracking-tight">Nova</span>
        </Link>

        {/* Live Search */}
        <LiveSearchBar />

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-1.5">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="h-10 w-10 flex items-center justify-center rounded-2xl text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-all active:scale-95 cursor-pointer"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-indigo-600" />}
          </button>

          {/* Messages dropdown */}
          <div className="relative">
            <button
              ref={msgBtnRef}
              onClick={toggleDropdown}
              className={cn(
                'relative h-10 w-10 flex items-center justify-center rounded-2xl transition-all active:scale-95 cursor-pointer',
                isDropdownOpen ? 'text-primary bg-primary/15 shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-accent/80'
              )}
              aria-label="Messages"
              aria-expanded={isDropdownOpen}
            >
              <MessageCircle className="h-5 w-5" />
              {unreadMessagesCount > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold ring-2 ring-background animate-pulse">
                  {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <MessagesPanel
                  panelRef={msgPanelRef}
                  filtered={filteredConvs}
                  isLoading={convsLoading}
                  search={msgSearch}
                  setSearch={setMsgSearch}
                  currentUserId={user?._id}
                  onConvClick={handleConvClick}
                  onClose={() => setDropdownOpen(false)}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              ref={notifBtnRef}
              onClick={() => setIsNotifOpen((prev) => !prev)}
              className={cn(
                'relative h-10 w-10 flex items-center justify-center rounded-2xl transition-all active:scale-95 cursor-pointer',
                isNotifOpen ? 'text-primary bg-primary/15 shadow-xs' : 'text-muted-foreground hover:text-foreground hover:bg-accent/80'
              )}
              aria-label="Notifications"
              aria-expanded={isNotifOpen}
            >
              <Bell className="h-5 w-5" />
              {notificationsData > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold ring-2 ring-background">
                  {notificationsData > 9 ? '9+' : notificationsData}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isNotifOpen && (
                <NotificationsDropdown
                  panelRef={notifPanelRef}
                  isOpen={isNotifOpen}
                  onClose={() => setIsNotifOpen(false)}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Profile menu */}
          <div className="relative">
            <button
              ref={profileBtnRef}
              onClick={() => setIsProfileMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-2xl p-1 hover:bg-accent/80 transition-all cursor-pointer border border-transparent hover:border-border/40"
              aria-expanded={isProfileMenuOpen}
              aria-label="Open profile menu"
            >
              <Avatar src={user?.avatar} name={user?.name} size="sm" showRing={isProfileMenuOpen} />
              <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-muted-foreground transition-transform duration-200" />
            </button>

            <AnimatePresence>
              {isProfileMenuOpen && (
                <motion.div
                  ref={profileMenuRef}
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 z-50 rounded-2xl border border-white/20 dark:border-white/10 bg-card/95 backdrop-blur-2xl shadow-2xl shadow-primary/10 py-2 overflow-hidden"
                >
                  {/* Profile info */}
                  <div className="px-4 py-3 border-b border-border/60 bg-muted/30">
                    <p className="font-bold text-sm text-foreground truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">@{user?.username}</p>
                  </div>

                  {/* Menu items */}
                  {[
                    { icon: User, label: 'My Profile', to: `/${user?.username}` },
                    { icon: Settings, label: 'Settings', to: '/settings' },
                  ].map(({ icon: Icon, label, to }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground font-medium hover:bg-accent/80 hover:text-primary transition-colors"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {label}
                    </Link>
                  ))}

                  <div className="border-t border-border/60 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        logoutMutation.mutate();
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <Modal
        open={isCreatePostOpen}
        onOpenChange={setIsCreatePostOpen}
        title="Create Post"
      >
        <PostEditor isModal onSuccess={() => setIsCreatePostOpen(false)} />
      </Modal>
    </header>
  );
}

