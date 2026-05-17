// [auto] Virtual scroll optimization
import { useState, useRef, useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';
import {
  Volume2, VolumeX, Heart, MessageCircle, Share2, Bookmark,
  ChevronUp, ChevronDown, Play, Pause, Sparkles, X, Plus, Flag
} from 'lucide-react';
import api from '@/shared/api/axios.instance.js';
import Avatar from '@/shared/components/Avatar.jsx';
import { Link } from 'react-router-dom';
import { formatCount } from '@/shared/utils/formatters.js';
import { cn } from '@/shared/utils/cn.js';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import { toast } from '@/shared/hooks/useToast.js';
import { Skeleton } from '@/shared/components/Skeleton.jsx';
import Button from '@/shared/components/Button.jsx';
import CommentSection from '@/features/posts/components/CommentSection.jsx';
import SharePostModal from '@/features/posts/components/SharePostModal.jsx';
import CreateReelModal from '../components/CreateReelModal.jsx';

function ReelItem({ reel, isActive }) {
  const { user } = useAuthStore();
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(reel.userReaction === 'like');
  const [likeCount, setLikeCount] = useState(reel.totalReactions || 0);
  const [progress, setProgress] = useState(0);
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const lastClickTimeRef = useRef(0);

  // Auto-play when active
  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      api.post(`/reels/${reel._id}/view`).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive, reel._id]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleLike = () => {
    setLiked((l) => !l);
    setLikeCount((c) => liked ? c - 1 : c + 1);
    api.post(`/reels/${reel._id}/react`, { type: 'like' }).catch(() => {});
  };

  const handleReport = () => {
    const reason = prompt('Lý do báo cáo Reel này (spam, harassment, hate_speech, nudity, violence, other):', 'spam');
    if (!reason) return;
    
    api.post(`/reels/${reel._id}/report`, { reason })
      .then(() => toast.success('Cảm ơn bạn, báo cáo đã được gửi!'))
      .catch((err) => toast.error(err.response?.data?.message || 'Không thể gửi báo cáo'));
  };

  const handleVideoClick = (e) => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastClickTimeRef.current;
    
    if (timeDiff < 300) {
      // Double click!
      if (!liked) {
        toggleLike();
      }
      setShowHeartPop(true);
      setTimeout(() => setShowHeartPop(false), 800);
    } else {
      // Single click - toggle play/pause
      togglePlay();
    }
    lastClickTimeRef.current = currentTime;
  };

  return (
    <div className="relative w-full h-[calc(100vh-9.5rem)] md:h-[calc(100vh-6rem)] flex items-center justify-center bg-black/90 snap-start overflow-hidden p-2 md:p-0">
      {/* Blurry background image for cinematic desktop feel */}
      <div 
        className="hidden md:block absolute inset-0 opacity-20 blur-3xl scale-110 pointer-events-none select-none bg-cover bg-center"
        style={{ backgroundImage: `url(${reel.video?.thumbnail || reel.author?.avatar})` }}
      />

      {/* Portrait Video Card Container */}
      <div className="relative w-full h-full rounded-3xl overflow-hidden bg-black shadow-2xl border border-white/10 flex items-center justify-center md:aspect-[9/16] md:max-h-[850px]">
        
        {/* Video Player */}
        <video
          ref={videoRef}
          src={reel.video?.url}
          className="h-full w-full object-cover cursor-pointer"
          loop
          muted={isMuted}
          playsInline
          poster={reel.video?.thumbnail}
          onClick={handleVideoClick}
          onTimeUpdate={(e) => setProgress((e.target.currentTime / e.target.duration) * 100)}
          aria-label={`Reel by ${reel.author?.name}`}
        />

        {/* Double Click Heart Animation Pop */}
        <AnimatePresence>
          {showHeartPop && (
            <motion.div
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1.3 }}
              exit={{ opacity: 0, scale: 1.7, y: -40 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
            >
              <Heart className="h-24 w-24 text-red-500 fill-red-500 drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Play/pause overlay indicator */}
        <AnimatePresence>
          {!isPlaying && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            >
              <div className="h-16 w-16 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-md border border-white/20">
                <Play className="h-7 w-7 text-white ml-0.5" fill="white" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none z-10" />

        {/* Bottom Details & Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-6 z-20 pointer-events-none">
          <div className="flex items-end justify-between gap-4">
            
            {/* Author info + caption */}
            <div className="flex-1 space-y-2 pointer-events-auto text-left">
              <Link to={`/${reel.author?.username}`} className="flex items-center gap-2.5 group w-fit">
                <Avatar src={reel.author?.avatar} name={reel.author?.name} size="sm" showRing className="group-hover:scale-105 transition-transform" />
                <span className="font-bold text-white text-sm hover:underline tracking-tight">{reel.author?.name}</span>
              </Link>
              {reel.caption && (
                <p className="text-white/95 text-xs md:text-sm leading-relaxed line-clamp-2 drop-shadow-md font-medium">{reel.caption}</p>
              )}
              {reel.hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {reel.hashtags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-primary-foreground font-bold text-xs drop-shadow-sm hover:underline cursor-pointer bg-primary/20 backdrop-blur-md px-2 py-0.5 rounded-md">#{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons overlay */}
            <div className="flex flex-col items-center gap-3.5 pointer-events-auto">
              <button 
                onClick={toggleLike} 
                className="flex flex-col items-center gap-1 group focus:outline-none cursor-pointer" 
                aria-label="Like reel"
              >
                <div className={cn(
                  'h-11 w-11 rounded-full flex items-center justify-center backdrop-blur-xl border border-white/10 transition-all duration-300 shadow-lg',
                  liked 
                    ? 'bg-red-500 text-white shadow-red-500/40' 
                    : 'bg-black/40 hover:bg-white/20 text-white hover:scale-110 active:scale-95'
                )}>
                  <Heart className={cn('h-5.5 w-5.5', liked && 'fill-white')} />
                </div>
                <span className="text-white text-[11px] font-bold drop-shadow-md">{formatCount(likeCount)}</span>
              </button>

              <button 
                onClick={() => setShowComments(true)}
                className="flex flex-col items-center gap-1 group focus:outline-none hover:scale-105 transition-transform cursor-pointer" 
                aria-label="Comments"
              >
                <div className="h-11 w-11 rounded-full bg-black/40 hover:bg-white/20 border border-white/10 flex items-center justify-center backdrop-blur-xl text-white shadow-lg">
                  <MessageCircle className="h-5.5 w-5.5" />
                </div>
                <span className="text-white text-[11px] font-bold drop-shadow-md">{formatCount(reel.commentCount)}</span>
              </button>

              <button 
                onClick={() => setShowShareModal(true)}
                className="flex flex-col items-center gap-1 group focus:outline-none hover:scale-105 transition-transform cursor-pointer" 
                aria-label="Share reel"
              >
                <div className="h-11 w-11 rounded-full bg-black/40 hover:bg-white/20 border border-white/10 flex items-center justify-center backdrop-blur-xl text-white shadow-lg">
                  <Share2 className="h-5.5 w-5.5" />
                </div>
                <span className="text-white text-[11px] font-bold drop-shadow-md">Share</span>
              </button>

              {/* Report button */}
              {user?._id !== reel.author?._id && (
                <button 
                  onClick={handleReport}
                  className="flex flex-col items-center gap-1 group focus:outline-none hover:scale-105 transition-transform cursor-pointer" 
                  aria-label="Report reel"
                >
                  <div className="h-11 w-11 rounded-full bg-red-500/20 hover:bg-red-500/35 border border-red-500/30 flex items-center justify-center backdrop-blur-xl text-red-400 shadow-lg">
                    <Flag className="h-5 w-5" />
                  </div>
                  <span className="text-white/80 text-[10px] font-semibold drop-shadow-md">Report</span>
                </button>
              )}

              <button
                onClick={() => setIsMuted((m) => !m)}
                className="h-11 w-11 rounded-full bg-black/40 hover:bg-white/20 border border-white/10 flex items-center justify-center backdrop-blur-xl text-white transition-transform active:scale-95 cursor-pointer shadow-lg"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="h-5 w-5 text-amber-400" /> : <Volume2 className="h-5 w-5 text-white" />}
              </button>
            </div>

          </div>
        </div>

        {/* Playback progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/15 z-20">
          <div
            className="h-full bg-nova-gradient transition-all duration-100 shadow-sm"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Comments Drawer overlay */}
        <AnimatePresence>
          {showComments && (
            <>
              {/* Backdrop */}
              <div 
                className="absolute inset-0 bg-black/70 z-30 cursor-pointer backdrop-blur-md"
                onClick={() => setShowComments(false)}
              />
              {/* Slide Up Panel */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                className="absolute bottom-0 left-0 right-0 h-[68%] bg-card/95 backdrop-blur-2xl rounded-t-3xl border-t border-white/20 dark:border-white/10 z-40 flex flex-col overflow-hidden pointer-events-auto shadow-2xl"
              >
                {/* Header */}
                <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground">Comments</span>
                  <button 
                    onClick={() => setShowComments(false)}
                    className="p-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {/* Content */}
                <div className="flex-1 overflow-y-auto px-4 py-2 scrollbar-hide">
                  <CommentSection postId={reel._id} commentCount={reel.commentCount} />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Share Modal overlay */}
        <AnimatePresence>
          {showShareModal && (
            <SharePostModal 
              post={{ ...reel, content: reel.caption }} 
              onClose={() => setShowShareModal(false)} 
            />
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

export default function ReelsPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const containerRef = useRef(null);
  const qc = useQueryClient();

  const { data, isLoading, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['reels'],
    queryFn: ({ pageParam }) =>
      api.get('/reels', { params: { cursor: pageParam, limit: 5 } }).then((r) => r.data.data),
    getNextPageParam: (last) => last.nextCursor || undefined,
    initialPageParam: undefined,
  });

  const seedMutation = useMutation({
    mutationFn: () => api.post('/reels/seed'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reels'] });
      toast.success('Random reels created successfully!');
    },
    onError: () => {
      toast.error('Failed to create random reels');
    }
  });

  const reels = data?.pages?.flatMap((p) => p.reels) || [];

  // Intersection observer for each reel
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight } = containerRef.current;
    const index = Math.round(scrollTop / clientHeight);
    setActiveIndex(index);

    // Load more when near end
    if (index >= reels.length - 2 && hasNextPage) {
      fetchNextPage();
    }
  }, [reels.length, hasNextPage, fetchNextPage]);

  return (
    <div className="-mt-4 -mx-4 md:-mx-6 lg:mx-0 relative">
      {/* Floating Buttons */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        <Button
          onClick={() => setShowCreateModal(true)}
          variant="gradient"
          size="sm"
          className="shadow-xl gap-1.5 px-4 py-2 hover:scale-105 active:scale-95 transition-all font-bold rounded-full"
        >
          <Plus className="h-4 w-4" />
          <span>Create Reel</span>
        </Button>

        <Button
          onClick={() => seedMutation.mutate()}
          isLoading={seedMutation.isPending}
          variant="glass"
          size="sm"
          className="bg-black/60 hover:bg-black/80 text-white border-white/20 backdrop-blur-xl rounded-full shadow-xl gap-1.5 px-4 py-2 hover:scale-105 active:scale-95 transition-all font-semibold"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>Random Reels</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-1">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-screen" />
          ))}
        </div>
      ) : (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-[calc(100vh-9.5rem)] md:h-[calc(100vh-6rem)] overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
          style={{ scrollSnapType: 'y mandatory' }}
          aria-label="Reels feed"
        >
          {reels.map((reel, index) => (
            <ReelItem key={reel._id} reel={reel} isActive={index === activeIndex} />
          ))}

          {reels.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground glass-card rounded-3xl p-10 gap-4">
              <p className="font-bold text-sm">No reels available</p>
              <Button onClick={() => seedMutation.mutate()} isLoading={seedMutation.isPending} variant="gradient">
                Create Random Reels
              </Button>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showCreateModal && (
          <CreateReelModal onClose={() => setShowCreateModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

