// [auto] Infinite scroll feed page
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, RefreshCw } from 'lucide-react';
import api from '@/shared/api/axios.instance.js';
import PostCard from '@/features/posts/components/PostCard.jsx';
import { PostSkeleton } from '@/shared/components/Skeleton.jsx';
import StoryRing from '@/features/stories/components/StoryRing.jsx';
import PostEditor from '@/features/posts/components/PostEditor.jsx';
import Button from '@/shared/components/Button.jsx';
import ReelsShelf from '@/features/feed/components/ReelsShelf.jsx';
import ReelsOverlayPlayer from '@/features/feed/components/ReelsOverlayPlayer.jsx';

export default function FeedPage() {
  const { ref: bottomRef, inView } = useInView({
    rootMargin: '400px',
  });
  const [activeReelId, setActiveReelId] = useState(null);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
    isError,
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) =>
      api.get('/posts/feed', { params: { cursor: pageParam, limit: 10 } }).then((r) => r.data.data),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    initialPageParam: undefined,
  });

  // Auto-load next page when bottom sentinel is visible
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage]);

  const allPosts = data?.pages?.flatMap((page) => page.posts) || [];

  return (
    <div className="space-y-4">
      {/* Page title */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Your Feed</h1>
      </div>

      {/* Stories */}
      <StoryRing />

      {/* Post editor */}
      <PostEditor />

      {/* Feed */}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)
        ) : isError ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground mb-4">Failed to load feed</p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          </div>
        ) : allPosts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-border bg-card p-12 text-center"
          >
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Your feed is empty</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Follow people or make friends to see their posts here.
            </p>
            <Button variant="gradient" asChild>
              <a href="/friends">Find People to Follow</a>
            </Button>
          </motion.div>
        ) : (
          allPosts.map((post, i) => (
            <motion.div
              key={post._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.3) }}
            >
              {post.type === 'reels_shelf' ? (
                <ReelsShelf reels={post.reels} onSelectReel={setActiveReelId} />
              ) : (
                <PostCard post={post} />
              )}
            </motion.div>
          ))
        )}

        {/* Infinite scroll skeleton */}
        {isFetchingNextPage && <PostSkeleton />}

        {/* Bottom sentinel */}
        <div ref={bottomRef} className="h-4" aria-hidden="true" />

        {/* End of feed */}
        {!hasNextPage && allPosts.length > 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            You're all caught up! 🎊
          </div>
        )}
      </div>

      {/* Fullscreen vertical snap Reels Player Overlay */}
      {activeReelId && (
        <ReelsOverlayPlayer
          reels={allPosts.find((p) => p.type === 'reels_shelf')?.reels || []}
          initialReelId={activeReelId}
          onClose={() => setActiveReelId(null)}
        />
      )}
    </div>
  );
}
