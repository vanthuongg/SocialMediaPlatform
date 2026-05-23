// [auto] Friend suggestion and requests UI
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Users, UserCheck, UserX, Search, MessageCircle, UserPlus } from 'lucide-react';
import { useState } from 'react';
import api from '@/shared/api/axios.instance.js';
import Avatar from '@/shared/components/Avatar.jsx';
import Button from '@/shared/components/Button.jsx';
import { Skeleton } from '@/shared/components/Skeleton.jsx';
import { toast } from '@/shared/hooks/useToast.js';
import { cn } from '@/shared/utils/cn.js';

const TABS = [
  { id: 'requests', label: 'Friend Requests' },
  { id: 'friends', label: 'All Friends' },
  { id: 'suggestions', label: 'Suggestions' },
];

function UserCard({ user, actions }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 transition-colors"
    >
      <Link to={`/${user.username}`} className="shrink-0">
        <Avatar src={user.avatar} name={user.name} size="md" isOnline={user.isOnline} />
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={`/${user.username}`}>
          <p className="font-semibold text-sm text-foreground hover:text-primary transition-colors">{user.name}</p>
        </Link>
        <p className="text-xs text-muted-foreground">@{user.username}</p>
        {user.mutualFriends > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">{user.mutualFriends} mutual friends</p>
        )}
      </div>
      <div className="flex gap-2 shrink-0">{actions}</div>
    </motion.div>
  );
}

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState('requests');
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data: requestsData, isLoading: isRequestsLoading } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: () => api.get('/users/me/friend-requests').then((r) => r.data.data),
    enabled: activeTab === 'requests',
  });

  const { data: friendsData, isLoading: isFriendsLoading } = useQuery({
    queryKey: ['friends'],
    queryFn: () => api.get('/users/me/friends').then((r) => r.data.data),
    enabled: activeTab === 'friends',
  });

  const { data: suggestionsData, isLoading: isSuggestionsLoading } = useQuery({
    queryKey: ['suggestions'],
    queryFn: () => api.get('/users/me/suggestions?limit=20').then((r) => r.data.data),
    enabled: activeTab === 'suggestions',
  });

  const acceptMutation = useMutation({
    mutationFn: (userId) => api.patch(`/users/${userId}/friend-request/accept`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['friendRequests'] }); toast.success('Friend request accepted!'); },
  });

  const friendRequestMutation = useMutation({
    mutationFn: (userId) => api.post(`/users/${userId}/friend-request`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suggestions'] });
      qc.invalidateQueries({ queryKey: ['friendRequests'] });
      toast.success('Friend request sent!');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to send request'),
  });

  const declineMutation = useMutation({
    mutationFn: (userId) => api.patch(`/users/${userId}/friend-request/decline`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['friendRequests'] }); toast.info('Friend request declined'); },
  });

  const navigate = useNavigate();
  const startConversationMutation = useMutation({
    mutationFn: (userId) => api.post('/messages/conversations', { userId }),
    onSuccess: (res) => {
      const convId = res.data.data.conversation._id;
      navigate(`/messages/${convId}`);
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to start conversation'),
  });

  const requests = Array.isArray(requestsData) ? requestsData : (requestsData?.requests || []);
  const friends = Array.isArray(friendsData) ? friendsData : (friendsData?.friends || []);
  const suggestions = Array.isArray(suggestionsData) ? suggestionsData : (suggestionsData?.suggestions || []);

  const isLoading = isRequestsLoading || isFriendsLoading || isSuggestionsLoading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Friends</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-border bg-card p-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex-1 py-2 px-2 rounded-xl text-sm font-medium transition-all duration-200',
              activeTab === id
                ? 'bg-primary text-primary-foreground shadow-nova-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            {label}
            {id === 'requests' && requests.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-xs">
                {requests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search (friends tab only) */}
      {activeTab === 'friends' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search friends..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Search friends"
          />
        </div>
      )}

      {/* Content */}
      <div className="grid sm:grid-cols-2 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))
        ) : (
          <>
            {activeTab === 'requests' && requests.map((req) => (
              <UserCard
                key={req._id}
                user={req.sender}
                actions={
                  <>
                    <Button size="sm" variant="gradient" onClick={() => acceptMutation.mutate(req._id)} isLoading={acceptMutation.isPending} className="font-bold flex items-center">
                      <UserCheck className="h-4 w-4" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => declineMutation.mutate(req._id)} className="font-bold">
                      <UserX className="h-4 w-4" />
                    </Button>
                  </>
                }
              />
            ))}

            {activeTab === 'friends' && friends
              .filter((f) => !search || f.name.toLowerCase().includes(search.toLowerCase()))
              .map((friend) => (
                <UserCard
                  key={friend._id}
                  user={friend}
                  actions={
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startConversationMutation.mutate(friend._id)}
                      isLoading={startConversationMutation.isPending}
                      className="font-semibold bg-card/60 backdrop-blur-sm border-border hover:bg-accent/30 hover:scale-[1.03] active:scale-[0.97] transition-all"
                    >
                      <MessageCircle className="h-4 w-4" /> Message
                    </Button>
                  }
                />
              ))}

            {activeTab === 'suggestions' && suggestions.map((user) => (
              <UserCard
                key={user._id}
                user={user}
                actions={
                  <Button
                    size="sm"
                    variant="gradient"
                    onClick={() => friendRequestMutation.mutate(user._id)}
                    isLoading={friendRequestMutation.isPending}
                    className="font-semibold text-white shadow-nova-sm hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center"
                  >
                    <UserPlus className="h-4 w-4" /> Add Friend
                  </Button>
                }
              />
            ))}
          </>
        )}
      </div>

      {/* Empty state */}
      {!isLoading && activeTab === 'requests' && requests.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold text-foreground">No friend requests</p>
          <p className="text-sm text-muted-foreground">When someone sends you a friend request, it'll appear here</p>
        </div>
      )}
    </div>
  );
}
