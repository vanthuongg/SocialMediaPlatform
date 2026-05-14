import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';
import { Bookmark, PackageOpen, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/shared/api/axios.instance.js';
import PostCard from '@/features/posts/components/PostCard.jsx';
import { PostSkeleton } from '@/shared/components/Skeleton.jsx';

export default function SavedPostsPage() {
  const navigate = useNavigate();
  const { ref, inView } = useInView({
    rootMargin: '400px',
  });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['savedPosts'],
    queryFn: ({ pageParam = 1 }) =>
      api.get('/posts/saved', { params: { page: pageParam, limit: 10 } }).then((r) => r.data),
    getNextPageParam: (last) => last.meta?.hasNext ? last.meta.page + 1 : undefined,
    initialPageParam: 1,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage]);

  const posts = data?.pages?.flatMap((p) => p.data) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="h-10 w-10 flex items-center justify-center rounded-full border border-border/80 bg-card/60 backdrop-blur-sm text-foreground hover:bg-accent transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
          title="Go back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Saved Posts</h1>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <PackageOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-semibold text-foreground">No saved posts</p>
            <p className="text-sm text-muted-foreground">Posts you save will appear here</p>
          </div>
        ) : (
          posts.map((post) => <PostCard key={post._id} post={post} />)
        )}
        {isFetchingNextPage && <PostSkeleton />}
        <div ref={ref} className="h-4" />
      </div>
    </div>
  );
}
