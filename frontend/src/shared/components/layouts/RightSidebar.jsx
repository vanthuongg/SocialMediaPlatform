// [auto] Right sidebar with suggestions
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Globe, Flame, MessageCircle, Hash, TrendingUp, Sparkles, Activity,
  Check
} from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import { useSocketStore } from '@/shared/stores/socket.store.js';
import { useChatStore } from '@/shared/stores/chat.store.js';
import Avatar from '../Avatar.jsx';
import Button from '../Button.jsx';
import api from '@/shared/api/axios.instance.js';
import { toast } from '@/shared/hooks/useToast.js';
import { cn } from '@/shared/utils/cn.js';

export default function RightSidebar() {
  const { user } = useAuthStore();
  const socket = useSocketStore((s) => s.socket);
  const isUserOnline = useSocketStore((s) => s.isUserOnline);
  const openChat = useChatStore((s) => s.openChat);
  const qc = useQueryClient();

  // Typing status state
  const [typingUsers, setTypingUsers] = useState(new Set());

  // 1. Fetch Conversations for Friends list
  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/messages/conversations').then((r) => r.data.data.conversations),
    staleTime: 30_000,
  });

  // Join socket rooms for conversations to receive typing indicators
  useEffect(() => {
    if (!socket || !conversations) return;
    conversations.forEach((c) => {
      socket.emit('conversation:join', { conversationId: c._id });
    });
    return () => {
      conversations.forEach((c) => {
        socket.emit('conversation:leave', { conversationId: c._id });
      });
    };
  }, [socket, conversations]);

  // Real-time typing indicators listener
  useEffect(() => {
    if (!socket) return;
    const handleTypingStart = ({ userId }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
    };
    const handleTypingStop = ({ userId }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);

    return () => {
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
    };
  }, [socket]);

  // 2. Fetch suggested users
  const { data: suggestedUsers } = useQuery({
    queryKey: ['suggestedUsers'],
    queryFn: () => api.get('/users/me/suggestions?limit=6').then((r) => r.data.data || []),
    staleTime: 60_000,
  });

  // 3. Fetch groups (suggested/joined)
  const { data: groupsDashboard } = useQuery({
    queryKey: ['groups-dashboard'],
    queryFn: () => api.get('/groups').then((r) => r.data.data),
    staleTime: 60_000,
  });

  // 4. Fetch trending posts
  const { data: trendingPosts } = useQuery({
    queryKey: ['trendingPosts'],
    queryFn: () =>
      api.get('/posts/feed').then((r) => {
        let posts = r.data.data.posts || [];
        return posts
          .sort((a, b) => (b.totalReactions + b.commentCount * 2) - (a.totalReactions + a.commentCount * 2))
          .slice(0, 3);
      }),
    staleTime: 30_000,
  });

  // Actions Mutators
  const friendRequestMutation = useMutation({
    mutationFn: (targetUserId) => api.post(`/users/${targetUserId}/friend-request`),
    onSuccess: () => {
      toast.success('Friend request sent!');
      qc.invalidateQueries({ queryKey: ['suggestedUsers'] });
      qc.invalidateQueries({ queryKey: ['friendRequests'] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to send request'),
  });

  const joinMutation = useMutation({
    mutationFn: (groupId) => api.post(`/groups/${groupId}/join`),
    onSuccess: (res) => {
      const data = res.data.data;
      if (data.status === 'joined') {
        toast.success('Joined community successfully! 🎉');
      } else {
        toast.info('Join request submitted.');
      }
      qc.invalidateQueries({ queryKey: ['groups-dashboard'] });
    },
  });

  // Derived arrays
  const discoverPeople = useMemo(() => suggestedUsers?.slice(0, 2) || [], [suggestedUsers]);
  const discoverCreators = useMemo(() => suggestedUsers?.slice(2, 5) || [], [suggestedUsers]);
  const discoverCommunities = useMemo(() => groupsDashboard?.suggestions?.slice(0, 2) || [], [groupsDashboard]);
  const popularCommunities = useMemo(() => {
    const list = [...(groupsDashboard?.joinedGroups || []), ...(groupsDashboard?.suggestions || [])];
    const unique = Array.from(new Map(list.map((g) => [g._id, g])).values());
    return unique.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0)).slice(0, 3);
  }, [groupsDashboard]);

  const allFriends = useMemo(() => {
    if (!conversations || !user) return [];
    const mapped = conversations
      .map((c) => {
        const other = c.participants.find((p) => p._id !== user._id);
        const online = other ? (other.isOnline || isUserOnline(other._id)) : false;
        const isLastOwn = c.lastMessage && (
          typeof c.lastMessage.sender === 'object'
            ? c.lastMessage.sender?._id?.toString() === user._id?.toString()
            : c.lastMessage.sender?.toString() === user._id?.toString()
        );
        const unreadCount = c.lastMessage && !isLastOwn && !c.lastMessage.readBy?.some((r) => {
          const id = typeof r.user === 'object' ? r.user?._id : r.user;
          return id?.toString() === user._id?.toString();
        }) ? 1 : 0;

        return {
          conversationId: c._id,
          friend: other,
          isOnline: online,
          unreadCount,
        };
      })
      .filter((f) => f.friend);

    return [...mapped].sort((a, b) => Number(b.isOnline) - Number(a.isOnline)).slice(0, 8);
  }, [conversations, user, isUserOnline]);

  const getSnippet = (post) => {
    if (post.content && post.content.trim()) return post.content;
    if (post.media && post.media.length > 0) return '📷 [Photo/Video]';
    if (post.sharedPost) return '🔄 Shared Post';
    return 'View Post';
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-1 scrollbar-hide space-y-4 pb-6">
      {/* 1. Trending Now */}
      <div className="glass-card rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-1.5 text-foreground px-1">
          <Flame className="h-4 w-4 text-amber-500 animate-pulse" />
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Trending Now</h3>
        </div>
        <div className="space-y-3">
          {trendingPosts && trendingPosts.length > 0 ? (
            trendingPosts.map((post) => (
              <Link key={post._id} to={`/posts/${post._id}`} className="block group">
                <div className="flex gap-2.5 items-start">
                  <Avatar src={post.author?.avatar} name={post.author?.name} size="xs" className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                      {post.author?.name}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                      {getSnippet(post)}
                    </p>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1 font-semibold">
                      <Activity className="h-3.5 w-3.5 text-emerald-500" /> {post.totalReactions || 0} reactions · {post.commentCount || 0} comments
                    </span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <p className="text-xs text-muted-foreground/80 px-1 py-1 italic">No trending posts yet</p>
          )}
        </div>
      </div>

      {/* 2. Discover */}
      <div className="glass-card rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-1.5 px-1">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Discover</h3>
        </div>
        <div className="space-y-3 divide-y divide-border/40">
          {/* People Suggestions */}
          {discoverPeople.length > 0 && (
            <div className="space-y-2.5 pt-2 first:pt-0">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Suggested People</p>
              {discoverPeople.map((p) => (
                <div key={p._id} className="flex items-center justify-between gap-2.5">
                  <Link to={`/${p.username}`} className="flex items-center gap-2 min-w-0">
                    <Avatar src={p.avatar} name={p.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate hover:text-primary transition-colors">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">@{p.username}</p>
                    </div>
                  </Link>
                  <Button
                    size="xs"
                    variant="gradient"
                    className="h-7 px-3 text-xs rounded-full font-bold shrink-0"
                    onClick={() => friendRequestMutation.mutate(p._id)}
                    isLoading={friendRequestMutation.isPending && friendRequestMutation.variables === p._id}
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Communities Suggestions */}
          {discoverCommunities.length > 0 && (
            <div className="space-y-2.5 pt-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Suggested Communities</p>
              {discoverCommunities.map((g) => (
                <div key={g._id} className="flex items-center justify-between gap-2.5">
                  <Link to={`/groups/${g._id}`} className="flex items-center gap-2 min-w-0">
                    <Avatar src={g.avatar} name={g.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate hover:text-primary transition-colors">
                        {g.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{g.memberCount || 1} members</p>
                    </div>
                  </Link>
                  <Button
                    size="xs"
                    variant="outline"
                    className="h-7 px-3 text-xs rounded-full font-bold shrink-0"
                    onClick={() => joinMutation.mutate(g._id)}
                    isLoading={joinMutation.isPending && joinMutation.variables === g._id}
                  >
                    Join
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Suggested Pages / Events */}
          <div className="space-y-2 pt-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pages & Events</p>
            <div className="bg-muted/40 rounded-xl p-2.5 flex items-center justify-between border border-border/40">
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">Local Events Hub</p>
                <p className="text-[10px] text-muted-foreground">Discover meetups & lives</p>
              </div>
              <span className="text-[9px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-extrabold uppercase shrink-0">Soon</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Popular Communities */}
      {popularCommunities.length > 0 && (
        <div className="glass-card rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-1.5 px-1">
            <Globe className="h-4 w-4 text-emerald-500" />
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Popular Communities</h3>
          </div>
          <div className="space-y-3">
            {popularCommunities.map((g) => (
              <div key={g._id} className="flex items-center justify-between gap-2.5">
                <Link to={`/groups/${g._id}`} className="flex items-center gap-2 min-w-0">
                  <Avatar src={g.avatar} name={g.name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate hover:text-primary transition-colors">
                      {g.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {g.memberCount || 1} members · <span className="text-emerald-500 font-bold">{Math.max(1, Math.floor((g.memberCount || 1) * 0.12))} active</span>
                    </p>
                  </div>
                </Link>
                {g.isJoined ? (
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mr-2" />
                ) : (
                  <Button
                    size="xs"
                    variant="outline"
                    className="h-7 px-3 text-xs rounded-full font-bold shrink-0"
                    onClick={() => joinMutation.mutate(g._id)}
                    isLoading={joinMutation.isPending && joinMutation.variables === g._id}
                  >
                    Join
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Online Friends */}
      <div className="glass-card rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-1.5 px-1">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Friends</h3>
        </div>
        <div className="space-y-2">
          {allFriends.length > 0 ? (
            allFriends.map((f) => {
              const isTyping = typingUsers.has(f.friend._id);
              return (
                <button
                  key={f.conversationId}
                  onClick={() => openChat(f.conversationId, f.friend)}
                  className="w-full flex items-center gap-2.5 text-left p-2 rounded-xl hover:bg-accent/80 transition-all group cursor-pointer"
                >
                  <Avatar src={f.friend?.avatar} name={f.friend?.name} size="sm" isOnline={f.isOnline} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {f.friend?.name}
                    </p>
                    <div className={cn(
                      "text-[10px] font-semibold truncate leading-tight mt-0.5 transition-colors",
                      f.isOnline ? "text-emerald-500" : "text-muted-foreground"
                    )}>
                      {isTyping ? (
                        <span className="flex items-center gap-0.5 text-emerald-500">
                          Typing
                          <span className="inline-flex gap-0.5">
                            <span className="h-1 w-1 bg-emerald-500 rounded-full animate-bounce delay-100" />
                            <span className="h-1 w-1 bg-emerald-500 rounded-full animate-bounce delay-200" />
                            <span className="h-1 w-1 bg-emerald-500 rounded-full animate-bounce delay-300" />
                          </span>
                        </span>
                      ) : (
                        f.isOnline ? 'Active now' : 'Offline'
                      )}
                    </div>
                  </div>
                  {f.unreadCount > 0 && (
                    <span className="h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold shrink-0">
                      {f.unreadCount}
                    </span>
                  )}
                  <MessageCircle className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground/80 px-1 py-1 italic">No friends available</p>
          )}
        </div>
      </div>

      {/* 5. Suggested Creators */}
      {discoverCreators.length > 0 && (
        <div className="glass-card rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-1.5 px-1">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Suggested Creators</h3>
          </div>
          <div className="space-y-3">
            {discoverCreators.map((p) => (
              <div key={p._id} className="flex items-center justify-between gap-2.5">
                <Link to={`/${p.username}`} className="flex items-center gap-2 min-w-0">
                  <Avatar src={p.avatar} name={p.name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate hover:text-primary transition-colors">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold">@{p.username}</p>
                  </div>
                </Link>
                <Button
                  size="xs"
                  variant="gradient"
                  className="h-7 px-3 text-xs rounded-full font-bold shrink-0"
                  onClick={() => friendRequestMutation.mutate(p._id)}
                  isLoading={friendRequestMutation.isPending && friendRequestMutation.variables === p._id}
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Popular Tags */}
      <div className="glass-card rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-1.5 px-1">
          <TrendingUp className="h-4 w-4 text-blue-500" />
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Popular Tags</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['technology', 'design', 'react', 'photography', 'gaming'].map((tag) => (
            <Link
              key={tag}
              to={`/search?q=${tag}`}
              className="flex items-center gap-1 px-3 py-1 bg-muted/60 hover:bg-primary hover:text-white rounded-xl text-xs font-bold text-muted-foreground transition-all active:scale-95 border border-border/40"
            >
              <Hash className="h-3 w-3 shrink-0" />
              <span>{tag}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* 7. Footer */}
      <div className="glass-card rounded-2xl p-3 shadow-sm space-y-2 text-center">
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-muted-foreground/70 font-semibold justify-center">
          <button onClick={() => toast.info('Privacy policy page is coming soon!')} className="hover:text-primary hover:underline cursor-pointer">Privacy</button>
          <span>·</span>
          <button onClick={() => toast.info('Terms of Service page is coming soon!')} className="hover:text-primary hover:underline cursor-pointer">Terms</button>
          <span>·</span>
          <button onClick={() => toast.info('Help hub page is coming soon!')} className="hover:text-primary hover:underline cursor-pointer">Help</button>
          <span>·</span>
          <button onClick={() => toast.info('About Nova page is coming soon!')} className="hover:text-primary hover:underline cursor-pointer">About</button>
        </div>
        <p className="text-[10px] text-muted-foreground/40 font-bold pt-1 border-t border-border/30">
          Nova Social Platform © 2026
        </p>
      </div>
    </div>
  );
}

