import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/shared/hooks/useToast.js';
import { motion } from 'framer-motion';
import { TrendingUp, Flame, MessageCircle, Hash, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Avatar from '@/shared/components/Avatar.jsx';
import api from '@/shared/api/axios.instance.js';
import { Skeleton } from '@/shared/components/Skeleton.jsx';
import { cn } from '@/shared/utils/cn.js';

export default function TrendingWidget() {
  const qc = useQueryClient();
  const friendRequestMutation = useMutation({
    mutationFn: (targetUserId) => api.post(`/users/${targetUserId}/friend-request`),
    onSuccess: () => {
      toast.success('Friend request sent!');
      qc.invalidateQueries({ queryKey: ['suggestedUsers'] });
      qc.invalidateQueries({ queryKey: ['friendRequests'] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to send request'),
  });

  const { data: trendingPosts, isLoading: postsLoading } = useQuery({
    queryKey: ['trendingPosts'],
    queryFn: () => api.get('/posts/feed').then(r => {
      let posts = r.data.data.posts || [];
      return posts.sort((a, b) => (b.totalReactions + b.commentCount * 2) - (a.totalReactions + a.commentCount * 2)).slice(0, 3);
    }),
  });

  const getPostSnippet = (post) => {
    if (post.content && post.content.trim()) {
      return post.content;
    }
    if (post.media && post.media.length > 0) {
      const type = post.media[0].type === 'video' ? 'Video' : 'Photo';
      return `📷 [${type}]`;
    }
    if (post.sharedPost) {
      return '🔄 Shared a post';
    }
    return 'View post';
  };

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['suggestedUsers'],
    queryFn: () => api.get('/users/me/suggestions?limit=3').then(r => Array.isArray(r.data.data) ? r.data.data : []).catch(() => [])
  });

  const trendingTopics = ['#technology', '#reactjs', '#photography', '#morning'];

  return (
    <div className="space-y-4">
      {/* Trending Posts */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-foreground">
          <Flame className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-sm">Trending Now</h3>
        </div>
        
        <div className="space-y-4">
          {postsLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)
          ) : trendingPosts?.map((post) => (
            <Link key={post._id} to={`/posts/${post._id}`} className="block group">
              <div className="flex gap-3">
                <Avatar src={post.author?.avatar} name={post.author?.name} size="xs" className="mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors mb-0.5">
                    {post.author?.name}
                  </p>
                  <p className={cn(
                    "text-sm font-medium leading-snug line-clamp-2 mb-1",
                    (!post.content || !post.content.trim()) && "text-muted-foreground/80 italic text-xs"
                  )}>
                    {getPostSnippet(post)}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Flame className="w-3 h-3" /> {post.totalReactions}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {post.commentCount}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Trending Topics */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-foreground">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-sm">Popular Topics</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {trendingTopics.map(topic => (
            <Link key={topic} to={`/search?q=${topic.replace('#', '')}`} className="flex items-center gap-1 px-3 py-1.5 bg-accent text-accent-foreground rounded-lg text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors">
              <Hash className="w-3 h-3" /> {topic.replace('#', '')}
            </Link>
          ))}
        </div>
      </div>

      {/* Suggested Users */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-foreground">
            <Users className="w-5 h-5 text-emerald-500" />
            <h3 className="font-semibold text-sm">Suggested For You</h3>
          </div>
        </div>
        
        <div className="space-y-3">
          {usersLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)
          ) : users?.slice(0,3).map((user) => (
            <div key={user._id} className="flex items-center justify-between group">
              <Link to={`/${user.username}`} className="flex items-center gap-2">
                <Avatar src={user.avatar} name={user.name} size="sm" />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold group-hover:text-primary transition-colors">{user.name}</span>
                  <span className="text-xs text-muted-foreground">@{user.username}</span>
                </div>
              </Link>
              <button
                className="px-3 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
                onClick={() => friendRequestMutation.mutate(user._id)}
                disabled={friendRequestMutation.isPending && friendRequestMutation.variables === user._id}
              >
                {friendRequestMutation.isPending && friendRequestMutation.variables === user._id ? 'Sending...' : 'Add Friend'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
