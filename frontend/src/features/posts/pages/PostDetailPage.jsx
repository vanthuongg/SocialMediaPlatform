import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Sparkles, MessageCircle } from 'lucide-react';
import api from '@/shared/api/axios.instance.js';
import PostCard from '@/features/posts/components/PostCard.jsx';
import { PostSkeleton } from '@/shared/components/Skeleton.jsx';
import Button from '@/shared/components/Button.jsx';

export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: post, isLoading, isError, refetch } = useQuery({
    queryKey: ['post', id],
    queryFn: () => api.get(`/posts/${id}`).then((r) => r.data.data.post),
    enabled: !!id,
  });

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Post Details
        </h1>
      </div>

      {/* Main content */}
      <div className="space-y-4">
        {isLoading ? (
          <PostSkeleton />
        ) : isError || !post ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-4">
            <div className="text-5xl">🔍</div>
            <h3 className="text-lg font-semibold text-foreground">Post not found</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              The post you are looking for might have been deleted or is private.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <PostCard post={post} defaultShowComments={true} />
        )}
      </div>
    </div>
  );
}
