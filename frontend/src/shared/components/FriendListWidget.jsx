import { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, X, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import api from '@/shared/api/axios.instance.js';
import Avatar from '@/shared/components/Avatar.jsx';
import { useSocketStore } from '@/shared/stores/socket.store.js';
import { cn } from '@/shared/utils/cn.js';

/* ─── Tooltip on hover ─── */
function Tooltip({ label, children }) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={{ duration: 0.12 }}
            className="absolute right-full top-1/2 -translate-y-1/2 mr-3 z-50 pointer-events-none"
          >
            <div className="bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
              {label}
              <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Single friend row (Facebook style) ─── */
function FriendRow({ friend, onMessage, isOnline }) {
  return (
    <Tooltip label={isOnline ? `${friend.name} · Active now` : friend.name}>
      <button
        onClick={() => onMessage(friend)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 text-left group',
          'hover:bg-accent'
        )}
      >
        {/* Avatar with online dot */}
        <div className="relative shrink-0">
          <Avatar src={friend.avatar} name={friend.name} size="md" />
          {isOnline && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card" />
          )}
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate leading-tight">
            {friend.name}
          </p>
          <p className={cn(
            'text-[11px] leading-tight truncate',
            isOnline ? 'text-emerald-500' : 'text-muted-foreground'
          )}>
            {isOnline ? 'Active now' : 'Offline'}
          </p>
        </div>

        {/* Chat icon (shown on hover) */}
        <MessageCircle className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </button>
    </Tooltip>
  );
}

/* ─── Main Widget ─── */
export default function FriendListWidget() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [open, setOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);

  const isUserOnline = useSocketStore((s) => s.isUserOnline);

  const { data: friendsData, isLoading } = useQuery({
    queryKey: ['friends-widget'],
    queryFn: () => api.get('/users/me/friends?limit=100').then((r) => r.data.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const friends = useMemo(() => friendsData?.friends || [], [friendsData]);

  // Merge socket online status
  const enriched = useMemo(
    () => friends.map((f) => ({ ...f, _online: f.isOnline || isUserOnline(f._id) })),
    [friends, isUserOnline]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return enriched;
    const q = search.toLowerCase();
    return enriched.filter(
      (f) => f.name?.toLowerCase().includes(q) || f.username?.toLowerCase().includes(q)
    );
  }, [enriched, search]);

  const onlineFriends = filtered.filter((f) => f._online);
  const offlineFriends = filtered.filter((f) => !f._online);
  const onlineCount = enriched.filter((f) => f._online).length;

  const startConversation = useMutation({
    mutationFn: (friendId) =>
      api.post('/messages/conversations', { userId: friendId }).then((r) => r.data.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      navigate(`/messages/${data.conversation._id}`);
    },
  });

  const handleMessage = (friend) => startConversation.mutate(friend._id);

  // Focus input when search opens
  useEffect(() => {
    if (searching) searchRef.current?.focus();
  }, [searching]);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">

      {/* ── Collapsed FAB ── */}
      <AnimatePresence mode="wait">
        {!open && (
          <motion.button
            key="fab"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => setOpen(true)}
            className="relative h-12 w-12 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl hover:scale-105 transition-transform"
            title="Contacts"
          >
            <Users className="h-5 w-5" />
            {onlineCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-bold border-2 border-background">
                {onlineCount > 9 ? '9+' : onlineCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Expanded Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className={cn(
              'w-[280px] rounded-2xl border border-border shadow-2xl',
              'bg-card/95 backdrop-blur-xl flex flex-col overflow-hidden'
            )}
            style={{ maxHeight: 'calc(100vh - 5rem)' }}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2 min-w-0">
                {searching ? (
                  <motion.div
                    key="search-input"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: '100%' }}
                    className="flex items-center gap-2 flex-1"
                  >
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        ref={searchRef}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') { setSearching(false); setSearch(''); }
                        }}
                        placeholder="Search contacts..."
                        className="w-full h-8 pl-8 pr-3 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <button
                      onClick={() => { setSearching(false); setSearch(''); }}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="title" className="flex items-center gap-2 min-w-0">
                    <span className="text-base font-bold text-foreground truncate">Contacts</span>
                    {onlineCount > 0 && (
                      <span className="text-xs text-emerald-500 font-semibold shrink-0">
                        · {onlineCount} online
                      </span>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Action buttons */}
              {!searching && (
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => setSearching(true)}
                    className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Search"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Collapse"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* ── List ── */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-hide">
              {isLoading ? (
                /* Skeleton */
                <div className="space-y-1 p-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2">
                      <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-28 rounded bg-muted animate-pulse" />
                        <div className="h-2.5 w-16 rounded bg-muted animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-10 text-center">
                  <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {search ? 'No contacts found' : 'No friends yet'}
                  </p>
                  {!search && (
                    <Link
                      to="/friends"
                      className="text-xs text-primary hover:underline mt-1 inline-block"
                    >
                      Find people to add →
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  {/* Online section */}
                  {onlineFriends.length > 0 && (
                    <div>
                      {!search && (
                        <p className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                          Active now · {onlineFriends.length}
                        </p>
                      )}
                      {onlineFriends.map((f) => (
                        <FriendRow
                          key={f._id}
                          friend={f}
                          isOnline={true}
                          onMessage={handleMessage}
                        />
                      ))}
                    </div>
                  )}

                  {/* Offline section */}
                  {offlineFriends.length > 0 && (
                    <div>
                      {!search && onlineFriends.length > 0 && (
                        <div className="my-2 border-t border-border/40" />
                      )}
                      {!search && (
                        <p className="px-3 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                          {onlineFriends.length > 0 ? `Others · ${offlineFriends.length}` : `All contacts · ${offlineFriends.length}`}
                        </p>
                      )}
                      {offlineFriends.map((f) => (
                        <FriendRow
                          key={f._id}
                          friend={f}
                          isOnline={false}
                          onMessage={handleMessage}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Footer ── */}
            {!isLoading && friends.length > 0 && (
              <div className="px-4 py-2.5 border-t border-border/40 flex items-center justify-between">
                <Link
                  to="/friends"
                  className="text-xs text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  See all friends
                </Link>
                <span className="text-xs text-muted-foreground">
                  {friends.length} friend{friends.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
