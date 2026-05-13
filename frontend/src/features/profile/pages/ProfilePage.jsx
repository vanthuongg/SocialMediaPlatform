// [auto] Profile view with avatar and stats
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, UserMinus, MessageCircle, MapPin, Globe, Calendar, Users, Image, Grid3X3,
  Briefcase, GraduationCap, Heart, Hash, Sparkles, X, ChevronLeft, ChevronRight, Eye,
  ShieldOff, Shield, MoreHorizontal
} from 'lucide-react';
import api from '@/shared/api/axios.instance.js';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import Avatar from '@/shared/components/Avatar.jsx';
import Button from '@/shared/components/Button.jsx';
import PostCard from '@/features/posts/components/PostCard.jsx';
import PostEditor from '@/features/posts/components/PostEditor.jsx';
import { ProfileHeaderSkeleton, PostSkeleton } from '@/shared/components/Skeleton.jsx';
import { formatCount, formatDate } from '@/shared/utils/formatters.js';
import { toast } from '@/shared/hooks/useToast.js';
import { useState, useEffect } from 'react';
import { cn } from '@/shared/utils/cn.js';
import ReelsShelf from '@/features/feed/components/ReelsShelf.jsx';
import ReelsOverlayPlayer from '@/features/feed/components/ReelsOverlayPlayer.jsx';

export default function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('posts');
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(null);
  const [showListModal, setShowListModal] = useState(false);
  const [listType, setListType] = useState('');
  const [listTitle, setListTitle] = useState('');
  const [activeReelId, setActiveReelId] = useState(null);

  const handleStatClick = (label) => {
    if (label === 'Posts') {
      setActiveTab('posts');
      return;
    }
    const type = label.toLowerCase();
    setListType(type);
    setListTitle(label);
    setShowListModal(true);
  };

  // Handle escape key to close lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedMediaIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { data: profileData, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => api.get(`/users/${username}`).then((r) => r.data.data.user),
  });

  const { data: postsData, isLoading: isPostsLoading } = useQuery({
    queryKey: ['userPosts', username],
    queryFn: () => api.get(`/posts/user/${username}`).then((r) => r.data.data),
    enabled: activeTab === 'posts' || activeTab === 'media',
  });

  const profile = profileData;
  const isOwner = profile?._id === currentUser?._id;
  const posts = Array.isArray(postsData) ? postsData : [];
  const mediaPosts = posts.filter(p => p.media && p.media.length > 0);

  const followMutation = useMutation({
    mutationFn: (isFollowing) =>
      isFollowing ? api.delete(`/users/${profile._id}/follow`) : api.post(`/users/${profile._id}/follow`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      toast.success(profile.isFollowing ? 'Unfollowed' : `Following ${profile.name}`);
    },
  });

  const friendRequestMutation = useMutation({
    mutationFn: () => api.post(`/users/${profile._id}/friend-request`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      toast.success(`Friend request sent to ${profile.name}`);
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to send request'),
  });

  const acceptFriendRequestMutation = useMutation({
    mutationFn: () => api.patch(`/users/${profile._id}/friend-request/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      toast.success(`You are now friends with ${profile.name}`);
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to accept request'),
  });

  const startConversationMutation = useMutation({
    mutationFn: (userId) => api.post('/messages/conversations', { userId }),
    onSuccess: (res) => {
      navigate(`/messages/${res.data.data.conversation._id}`);
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to start conversation'),
  });

  const blockMutation = useMutation({
    mutationFn: (isBlocked) =>
      isBlocked
        ? api.delete(`/users/${profile?._id}/block`)
        : api.post(`/users/${profile?._id}/block`),
    onSuccess: (_, isBlocked) => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      toast.success(isBlocked ? `Unblocked ${profile?.name}` : `Blocked ${profile?.name}`);
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Action failed'),
  });

  if (isProfileLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto px-4">
        <ProfileHeaderSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-1"><div className="h-64 bg-card rounded-2xl animate-pulse" /></div>
          <div className="lg:col-span-2"><PostSkeleton /></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-3xl font-extrabold text-foreground mb-2">User not found</h2>
        <p className="text-muted-foreground">The user @{username} doesn't exist or may have been deleted.</p>
        <Button className="mt-6" variant="gradient" onClick={() => navigate('/')}>Go to Feed</Button>
      </div>
    );
  }

  const aboutDetails = [
    { icon: Briefcase, text: profile.work, show: !!profile.work },
    { icon: GraduationCap, text: profile.education, show: !!profile.education },
    { icon: Heart, text: profile.relationshipStatus, show: !!profile.relationshipStatus },
    { icon: MapPin, text: profile.location, show: !!profile.location },
    { icon: Globe, text: profile.website ? profile.website.replace(/^https?:\/\//, '') : '', isLink: true, href: profile.website, show: !!profile.website },
    { icon: Calendar, text: `Joined ${formatDate(profile.createdAt)}`, show: true },
  ].filter(d => d.show);

  return (
    <div className="max-w-5xl mx-auto pb-12 relative px-4 sm:px-6">
      {/* Cosmic Background Blobs */}
      <div className="absolute top-[-10%] left-[-15%] w-[300px] h-[300px] rounded-full bg-primary/10 blur-[80px] pointer-events-none -z-10 dark:bg-primary/5" />
      <div className="absolute top-[30%] right-[-15%] w-[350px] h-[350px] rounded-full bg-secondary/10 blur-[100px] pointer-events-none -z-10 dark:bg-secondary/5" />
      {/* Header Section */}
      <div className="rounded-3xl overflow-hidden bg-card/65 backdrop-blur-xl border border-border/50 shadow-nova mb-8 relative transition-all duration-300">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-20 h-9 w-9 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/10 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md"
          title="Go back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Cover Photo */}
        <div className="relative h-40 md:h-56 w-full overflow-hidden group">
          {profile.cover ? (
            <>
              <img
                src={profile.cover}
                alt="Cover"
                className="w-full h-full object-cover transition-transform duration-[2000ms] ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full bg-nova-gradient relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_60%)] animate-pulse" />
              <div className="flex flex-col items-center gap-1.5 opacity-60 text-white select-none">
                <Sparkles className="h-6 w-6 animate-bounce" />
                <span className="text-[10px] font-semibold tracking-widest uppercase">Nova Profile</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          )}
        </div>

        {/* Profile Identity Row */}
        <div className="px-6 md:px-8 pb-5 flex flex-col md:flex-row gap-5 md:items-end relative z-10 border-b border-border/40">
          
          {/* Avatar with Custom Ring */}
          <div className="relative mx-auto md:mx-0 shrink-0 -mt-10 md:-mt-12">
            <div className="p-0.5 rounded-full bg-gradient-to-tr from-primary via-fuchsia-500 to-cyan-400 shadow-nova hover:rotate-3 transition-all duration-500 cursor-pointer">
              <div className="rounded-full ring-2 ring-card bg-card overflow-hidden">
                <Avatar src={profile.avatar} name={profile.name} size="2xl" className="object-cover" />
              </div>
            </div>
            {profile.isOnline && (
              <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-card animate-pulse" title="Online" />
            )}
          </div>

          {/* Details & Actions */}
          <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 md:pt-4 text-center md:text-left">
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center justify-center md:justify-start gap-1.5">
                {profile.name}
                <Sparkles className="h-4.5 w-4.5 text-primary shrink-0" />
              </h1>
              <p className="text-muted-foreground font-semibold text-xs mt-0.5">@{profile.username}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 justify-center md:justify-end">
              {!isOwner ? (
                <>
                  <Button
                    variant={profile.isFollowing ? 'outline' : 'gradient'}
                    size="sm"
                    onClick={() => followMutation.mutate(profile.isFollowing)}
                    isLoading={followMutation.isPending}
                    className={cn(
                      "shadow-sm font-semibold flex items-center gap-1.5 hover:scale-[1.03] active:scale-[0.97] transition-all duration-300",
                      profile.isFollowing ? "border-border bg-card hover:bg-muted" : "text-white"
                    )}
                  >
                    {profile.isFollowing ? (
                      <><UserMinus className="h-4 w-4" /> Unfollow</>
                    ) : (
                      <><UserPlus className="h-4 w-4" /> Follow</>
                    )}
                  </Button>

                  {!profile.isFriend && (
                    profile.hasSentFriendRequest ? (
                      <Button variant="outline" size="sm" disabled className="font-semibold bg-muted text-muted-foreground border-border">
                        <Users className="h-4 w-4" /> Request Sent
                      </Button>
                    ) : profile.hasReceivedFriendRequest ? (
                      <Button 
                        variant="gradient" 
                        size="sm" 
                        onClick={() => acceptFriendRequestMutation.mutate()} 
                        isLoading={acceptFriendRequestMutation.isPending}
                        className="text-white shadow-nova-sm font-semibold hover:scale-[1.03] active:scale-[0.97] transition-all"
                      >
                        <Users className="h-4 w-4" /> Accept
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => friendRequestMutation.mutate()} 
                        isLoading={friendRequestMutation.isPending}
                        className="font-semibold bg-card/60 backdrop-blur-sm border-border hover:bg-accent/30 hover:scale-[1.03] active:scale-[0.97] transition-all"
                      >
                        <UserPlus className="h-4 w-4" /> Add Friend
                      </Button>
                    )
                  )}

                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => startConversationMutation.mutate(profile._id)} 
                    isLoading={startConversationMutation.isPending}
                    className="font-semibold bg-card/60 backdrop-blur-sm border-border hover:bg-accent/30 hover:scale-[1.03] active:scale-[0.97] transition-all"
                  >
                    <MessageCircle className="h-4 w-4" /> Message
                  </Button>

                  {/* Block/Unblock — shown as a discrete icon button */}
                  <button
                    onClick={() => blockMutation.mutate(!!profile.isBlocked)}
                    disabled={blockMutation.isPending}
                    title={profile.isBlocked ? 'Unblock user' : 'Block user'}
                    className={cn(
                      'h-8 w-8 flex items-center justify-center rounded-full border transition-all hover:scale-105 active:scale-95 disabled:opacity-50',
                      profile.isBlocked
                        ? 'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20'
                        : 'border-border bg-card/60 text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10'
                    )}
                  >
                    {profile.isBlocked ? <Shield className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
                  </button>
                </>
              ) : (
                <Button 
                  variant="gradient" 
                  size="sm" 
                  asChild 
                  className="text-white shadow-nova-sm font-semibold hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center gap-1.5"
                >
                  <Link to={`/${username}/edit`}>Edit Profile</Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-4 divide-x divide-border/40 bg-card/45 backdrop-blur-md">
          {[
            { label: 'Posts', value: profile.postsCount || 0 },
            { label: 'Friends', value: profile.friendsCount || 0 },
            { label: 'Followers', value: profile.followersCount || 0 },
            { label: 'Following', value: profile.followingCount || 0 },
          ].map(({ label, value }) => (
            <div 
              key={label} 
              onClick={() => handleStatClick(label)}
              className="flex flex-col items-center justify-center py-4 hover:bg-muted/40 transition-all duration-300 cursor-pointer group"
            >
              <span className="text-xl font-extrabold text-foreground group-hover:text-primary transition-colors group-hover:scale-105 transform duration-300">
                {formatCount(value)}
              </span>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5 group-hover:text-muted-foreground/80 transition-colors">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: About Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border border-border/50 bg-card/65 backdrop-blur-xl p-6 shadow-nova-sm sticky top-20">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2 border-b border-border/40 pb-3">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" /> Intro
            </h2>
            
            {profile.bio ? (
              <div className="mb-6 bg-primary/5 dark:bg-primary/10 border-l-4 border-primary rounded-r-xl p-4 transition-all hover:bg-primary/[0.08]">
                <p className="text-foreground text-sm leading-relaxed italic text-center">
                  "{profile.bio}"
                </p>
              </div>
            ) : isOwner ? (
              <Link 
                to={`/${username}/edit`} 
                className="block w-full text-center py-2.5 mb-6 rounded-xl border border-dashed border-border bg-muted/20 text-muted-foreground text-sm hover:bg-accent/40 transition-colors"
              >
                Add a bio to tell people about yourself
              </Link>
            ) : null}

            {/* About Details */}
            <div className="space-y-4">
              {aboutDetails.map((detail, i) => (
                <div key={i} className="flex items-center gap-3.5 text-sm text-foreground group">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary dark:bg-primary/20 shrink-0 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-white">
                    <detail.icon className="h-4.5 w-4.5" />
                  </div>
                  {detail.isLink ? (
                    <a 
                      href={detail.href} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary font-medium hover:underline break-all group-hover:text-primary/80 transition-colors"
                    >
                      {detail.text}
                    </a>
                  ) : (
                    <span className="font-medium text-foreground/80 group-hover:text-foreground transition-colors break-words">
                      {detail.text}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Hobbies */}
            {profile.hobbies && profile.hobbies.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border/40">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <Hash className="h-4 w-4 text-primary" /> Hobbies
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.hobbies.map((hobby, i) => (
                    <span 
                      key={i} 
                      className="px-3 py-1.5 rounded-xl bg-secondary/10 text-secondary dark:text-secondary-foreground text-xs font-semibold border border-secondary/15 transition-all duration-300 hover:scale-105 hover:bg-secondary/20 hover:border-secondary/30 cursor-default select-none shadow-sm"
                    >
                      {hobby}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {isOwner && (
              <Button variant="outline" className="w-full mt-6 border-border hover:bg-accent font-semibold transition-all duration-300" asChild>
                <Link to={`/${username}/edit`}>Edit Details</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Right Column: Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tabs */}
          <div className="flex rounded-full border border-border/50 bg-card/65 backdrop-blur-xl p-1 shadow-nova-sm w-fit relative">
            {[
              { id: 'posts', label: 'Timeline', icon: Grid3X3 },
              { id: 'media', label: 'Gallery', icon: Image },
            ].map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    'flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 relative z-10 outline-none',
                    isActive ? 'text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 relative z-10" />
                  <span className="relative z-10">{label}</span>
                  
                  {isActive && (
                    <motion.div
                      layoutId="activeTabPill"
                      className="absolute inset-0 bg-primary rounded-full z-0"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'posts' ? (
              <div className="space-y-4">
                {isOwner && <PostEditor />}
                {isPostsLoading ? (
                  Array.from({ length: 2 }).map((_, i) => <PostSkeleton key={i} />)
                ) : posts.length === 0 ? (
                  <div className="rounded-2xl border border-border/50 bg-card/65 backdrop-blur-xl p-16 text-center shadow-nova-sm">
                    <Grid3X3 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4 animate-pulse" />
                    <h3 className="text-lg font-bold text-foreground">No posts yet</h3>
                    <p className="text-muted-foreground mt-1">When {profile.name} posts something, you'll see it here.</p>
                  </div>
                ) : (
                  posts.filter((post) => post.type !== 'reels_shelf').map((post, idx) => (
                    <motion.div
                      key={post._id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                    >
                      <PostCard post={post} />
                    </motion.div>
                  ))
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {isPostsLoading
                  ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="aspect-square bg-muted rounded-2xl animate-pulse" />)
                  : mediaPosts.length === 0
                  ? (
                    <div className="col-span-full rounded-2xl border border-border/50 bg-card/65 backdrop-blur-xl p-16 text-center shadow-nova-sm">
                      <Image className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4 animate-pulse" />
                      <h3 className="text-lg font-bold text-foreground">No media found</h3>
                      <p className="text-muted-foreground mt-1">Photos and videos will appear here.</p>
                    </div>
                  )
                  : mediaPosts.map((post, idx) => (
                    <motion.div
                      key={post._id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: idx * 0.03 }}
                      onClick={() => setSelectedMediaIndex(idx)}
                      className="aspect-square bg-card rounded-2xl overflow-hidden group relative shadow-nova-sm border border-border/50 cursor-pointer"
                    >
                      {post.media[0].type === 'video' ? (
                        <div className="w-full h-full relative">
                          <video src={post.media[0].url} className="w-full h-full object-cover" />
                          <div className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-lg text-white">
                            <Image className="h-4 w-4" />
                          </div>
                        </div>
                      ) : (
                        <img 
                          src={post.media[0].url} 
                          alt="Media" 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        />
                      )}
                      
                      {/* Premium Overlay on Hover */}
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-2">
                        <Eye className="h-8 w-8 text-white scale-75 group-hover:scale-100 transition-transform duration-300" />
                        <span className="text-xs font-semibold text-white/90">View Media</span>
                      </div>
                    </motion.div>
                  ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedMediaIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
            onClick={() => setSelectedMediaIndex(null)}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedMediaIndex(null)}
              className="absolute top-6 right-6 z-55 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors backdrop-blur-sm border border-white/10"
              title="Close"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Navigation Controls */}
            {selectedMediaIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMediaIndex(selectedMediaIndex - 1);
                }}
                className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-55 bg-white/10 hover:bg-white/20 text-white p-3.5 rounded-full transition-all hover:scale-105 active:scale-95 backdrop-blur-sm border border-white/10"
                title="Previous"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {selectedMediaIndex < mediaPosts.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMediaIndex(selectedMediaIndex + 1);
                }}
                className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-55 bg-white/10 hover:bg-white/20 text-white p-3.5 rounded-full transition-all hover:scale-105 active:scale-95 backdrop-blur-sm border border-white/10"
                title="Next"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            {/* Media View */}
            <motion.div
              key={selectedMediaIndex}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative max-w-4xl max-h-[80vh] flex flex-col items-center justify-center w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {mediaPosts[selectedMediaIndex].media[0].type === 'video' ? (
                <video
                  src={mediaPosts[selectedMediaIndex].media[0].url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[70vh] rounded-2xl shadow-2xl border border-white/10"
                />
              ) : (
                <img
                  src={mediaPosts[selectedMediaIndex].media[0].url}
                  alt="Enlarged gallery view"
                  className="max-w-full max-h-[70vh] rounded-2xl shadow-2xl object-contain border border-white/10"
                />
              )}
              
              {/* Post Context Info Bar */}
              <div className="mt-4 w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md text-white">
                <div className="flex items-center gap-3">
                  <Avatar src={profile.avatar} name={profile.name} size="sm" />
                  <div className="text-left">
                    <p className="text-sm font-semibold">{profile.name}</p>
                    <p className="text-xs text-white/60">@{profile.username}</p>
                  </div>
                </div>
                
                <Link
                  to={`/posts/${mediaPosts[selectedMediaIndex]._id}`}
                  className="text-xs font-semibold px-4 py-2 bg-white text-black hover:bg-white/90 rounded-lg transition-colors"
                  onClick={() => setSelectedMediaIndex(null)}
                >
                  Go to Post
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friends / Followers List Modal */}
      <UserListModal
        isOpen={showListModal}
        onClose={() => setShowListModal(false)}
        title={listTitle}
        userId={profile._id}
        listType={listType}
      />

      {/* Fullscreen vertical snap Reels Player Overlay */}
      {activeReelId && (
        <ReelsOverlayPlayer
          reels={posts.find((p) => p.type === 'reels_shelf')?.reels || []}
          initialReelId={activeReelId}
          onClose={() => setActiveReelId(null)}
        />
      )}
    </div>
  );
}

function UserListModal({ isOpen, onClose, title, userId, listType }) {
  const { data: users, isLoading } = useQuery({
    queryKey: ['userList', userId, listType],
    queryFn: () => api.get(`/users/${userId}/${listType}`).then((r) => r.data.data),
    enabled: isOpen && !!userId && !!listType,
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[480px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-base font-bold text-foreground capitalize">{title}</h2>
              <button
                onClick={onClose}
                className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* List */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 scrollbar-hide">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-28 bg-muted rounded animate-pulse" />
                      <div className="h-2.5 w-16 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                ))
              ) : !users || users.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No {listType} found.
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {users.map((u) => (
                    <div key={u._id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                      <Link
                        to={`/${u.username}`}
                        onClick={onClose}
                        className="flex items-center gap-3 group"
                      >
                        <Avatar src={u.avatar} name={u.name} size="sm" />
                        <div className="text-left">
                          <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">{u.name}</p>
                          <p className="text-xs text-muted-foreground leading-tight">@{u.username}</p>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
