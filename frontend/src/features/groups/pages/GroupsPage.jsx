// [auto] Group list and management
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Globe, Users, Plus, Search, Shield, ArrowRight, Star, ArrowLeft, PlusCircle } from 'lucide-react';
import api from '@/shared/api/axios.instance.js';
import Avatar from '@/shared/components/Avatar.jsx';
import Button from '@/shared/components/Button.jsx';
import Input from '@/shared/components/Input.jsx';
import { Skeleton } from '@/shared/components/Skeleton.jsx';
import { toast } from '@/shared/hooks/useToast.js';

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('discover'); // 'discover' or 'mine'
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch groups dashboard (Joined, Featured, Suggestions)
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['groups-dashboard'],
    queryFn: () => api.get('/groups').then((res) => res.data.data),
  });

  // Fetch search results if searchQuery exists
  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['groups-search', searchQuery],
    queryFn: () => api.get('/groups/search', { params: { q: searchQuery } }).then((res) => res.data.data.groups),
    enabled: searchQuery.trim().length > 0,
  });

  // Join group mutation
  const joinMutation = useMutation({
    mutationFn: (groupId) => api.post(`/groups/${groupId}/join`),
    onSuccess: (res) => {
      const data = res.data.data;
      if (data.status === 'joined') {
        toast.success('Joined group successfully! 🎉');
      } else {
        toast.info('Join request submitted for approval.');
      }
      queryClient.invalidateQueries({ queryKey: ['groups-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['groups-search'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to join group');
    },
  });

  const isSearchActive = searchQuery.trim().length > 0;
  const groupsToDisplay = isSearchActive
    ? searchResults || []
    : activeTab === 'mine'
    ? dashboard?.joinedGroups || []
    : dashboard?.suggestions || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6 pb-24">
      {/* Back button */}
      <Link to="/feed" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="h-4 w-4" /> Back to Home Feed
      </Link>

      {/* Header card */}
      <div className="rounded-3xl border border-border/50 bg-card/45 backdrop-blur-md p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-nova">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" /> Groups Hub
          </h1>
          <p className="text-sm text-muted-foreground">
            Discover communities, share ideas, and connect with people who share your interests.
          </p>
        </div>
        <Link to="/groups/create">
          <Button variant="gradient" size="md" className="shrink-0 flex items-center gap-2 shadow-nova-sm">
            <Plus className="h-4 w-4" /> Create Community
          </Button>
        </Link>
      </div>

      {/* Navigation tabs & search */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between border-b border-border/50 pb-4">
        <div className="flex gap-2 bg-muted/40 p-1 rounded-xl w-fit">
          <button
            onClick={() => { setActiveTab('discover'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === 'discover' && !isSearchActive
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Discover Suggestions
          </button>
          <button
            onClick={() => { setActiveTab('mine'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === 'mine' && !isSearchActive
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            My Communities ({dashboard?.joinedGroups?.length || 0})
          </button>
        </div>

        {/* Search bar */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search communities..."
            className="pl-10 w-full rounded-xl bg-card border border-border/40 focus:border-primary/50 text-sm py-2"
          />
        </div>
      </div>

      {/* Groups Feed/Grid */}
      {isLoading || (isSearchActive && isSearching) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="border border-border/50 bg-card rounded-2xl p-4 space-y-3">
              <Skeleton className="h-28 rounded-xl w-full" />
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : groupsToDisplay.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/60 rounded-3xl bg-muted/20">
          <Globe className="h-12 w-12 text-muted-foreground/60 mb-3" />
          <h3 className="text-base font-bold text-foreground">No Groups Found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            {isSearchActive
              ? "We couldn't find any communities matching your search query. Try another term!"
              : activeTab === 'mine'
              ? "You haven't joined or created any groups yet. Explore suggestions to get started!"
              : "No suggested groups available at the moment."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Main List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {groupsToDisplay.map((group) => {
              const isMember = dashboard?.joinedGroups?.some((g) => g._id === group._id) || group.isJoined;
              return (
                <div
                  key={group._id}
                  className="rounded-2xl border border-border/50 bg-card shadow-sm hover:shadow-nova transition-all duration-300 overflow-hidden flex flex-col group"
                >
                  {/* Cover */}
                  <div className="h-28 bg-muted relative overflow-hidden">
                    {group.cover ? (
                      <img src={group.cover} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-primary/20 via-accent/15 to-transparent" />
                    )}
                    <span className="absolute top-3 right-3 text-[10px] bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {group.privacy}
                    </span>
                  </div>

                  {/* Body info */}
                  <div className="p-4 flex-1 flex flex-col relative pt-8">
                    {/* Avatar floating */}
                    <div className="absolute -top-7 left-4 ring-4 ring-card rounded-2xl overflow-hidden shadow-md">
                      <Avatar src={group.avatar} name={group.name} size="md" />
                    </div>

                    <div className="space-y-1">
                      <Link to={`/groups/${group._id}`} className="font-bold text-base text-foreground hover:text-primary transition-colors line-clamp-1">
                        {group.name}
                      </Link>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                        <Users className="h-3.5 w-3.5" /> {group.memberCount || 1} members
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed flex-1">
                      {group.description || 'Welcome to our community! Connect, share posts, and stay updated.'}
                    </p>

                    {/* Bottom actions */}
                    <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between gap-3">
                      {isMember ? (
                        <Link to={`/groups/${group._id}`} className="w-full">
                          <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-1">
                            Visit Group <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          variant="gradient"
                          size="sm"
                          className="w-full"
                          onClick={() => joinMutation.mutate(group._id)}
                          isLoading={joinMutation.isPending && joinMutation.variables === group._id}
                        >
                          Join Group
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trending sidebar block on discover tab */}
          {activeTab === 'discover' && !isSearchActive && dashboard?.featuredGroups?.length > 0 && (
            <div className="space-y-4 border-t border-border/40 pt-8">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" /> Featured Communities
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dashboard.featuredGroups.map((group) => (
                  <div
                    key={group._id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-border/40 bg-card hover:bg-muted/10 transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar src={group.avatar} name={group.name} size="sm" className="rounded-lg shadow-sm" />
                      <div className="min-w-0">
                        <Link to={`/groups/${group._id}`} className="font-semibold text-sm text-foreground hover:underline hover:text-primary transition-all truncate block">
                          {group.name}
                        </Link>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> {group.memberCount} members
                        </p>
                      </div>
                    </div>
                    <Link to={`/groups/${group._id}`}>
                      <Button variant="outline" size="xs" className="flex items-center gap-1 shrink-0">
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
