import { useParams, useNavigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Hash, ArrowLeft, TrendingUp } from 'lucide-react';
import api from '@/shared/api/axios.instance.js';
import PostCard from '@/features/posts/components/PostCard.jsx';
import { PostSkeleton } from '@/shared/components/Skeleton.jsx';

export default function HashtagPage() {
  const { tag } = useParams();
  const navigate = useNavigate();
  const { ref, inView } = useInView({
    rootMargin: '400px',
  });

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['hashtag', tag],
    queryFn: ({ pageParam = 1 }) =>
      api
        .get(`/search/hashtag/${encodeURIComponent(tag)}`, { params: { page: pageParam, limit: 10 } })
        .then((r) => r.data),
    getNextPageParam: (last) => (last.meta?.hasNext ? last.meta.page + 1 : undefined),
    initialPageParam: 1,
    enabled: !!tag,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage]);

  const posts = data?.pages?.flatMap((p) => p.data) || [];
  const totalPosts = data?.pages?.[0]?.meta?.total || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Hash className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">#{tag}</h1>
            {totalPosts > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {totalPosts.toLocaleString()} posts
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)
        ) : isError ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <Hash className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-semibold text-foreground">Failed to load posts</p>
          </div>
        ) : posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-border bg-card p-12 text-center"
          >
            <Hash className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-semibold text-foreground">No posts with #{tag}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Be the first to post with this hashtag!
            </p>
          </motion.div>
        ) : (
          posts.map((post, i) => (
            <motion.div
              key={post._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.3) }}
            >
              <PostCard post={post} />
            </motion.div>
          ))
        )}

        {isFetchingNextPage && <PostSkeleton />}
        <div ref={ref} className="h-4" />

        {!hasNextPage && posts.length > 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            All posts with #{tag} loaded 🎊
          </div>
        )}
      </div>
    </div>
  );
}
