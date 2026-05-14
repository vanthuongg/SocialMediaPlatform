import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Heart, MessageCircle, Share2, X, Play, Pause } from 'lucide-react';
import Avatar from '@/shared/components/Avatar.jsx';
import { Link } from 'react-router-dom';
import { formatCount } from '@/shared/utils/formatters.js';
import { cn } from '@/shared/utils/cn.js';
import api from '@/shared/api/axios.instance.js';
import CommentSection from '@/features/posts/components/CommentSection.jsx';
import SharePostModal from '@/features/posts/components/SharePostModal.jsx';

function OverlayReelItem({ reel, isActive, onClose }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [liked, setLiked] = useState(reel.userReaction === 'like');
  const [likeCount, setLikeCount] = useState(reel.totalReactions || 0);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

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

  const toggleMute = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleLike = (e) => {
    e.stopPropagation();
    setLiked((l) => !l);
    setLikeCount((c) => liked ? c - 1 : c + 1);
    api.post(`/reels/${reel._id}/react`, { type: 'like' }).catch(() => {});
  };

  return (
    <div className="w-full h-full flex items-center justify-center snap-start relative bg-zinc-950">
      {/* Cinematic blurred background */}
      <div 
        className="absolute inset-0 opacity-20 blur-3xl scale-110 pointer-events-none select-none bg-cover bg-center"
        style={{ backgroundImage: `url(${reel.video?.thumbnail || reel.author?.avatar})` }}
      />

      {/* Main Video Box */}
      <div className="relative w-full max-w-[450px] h-full flex items-center justify-center bg-black overflow-hidden shadow-2xl">
        <video
          ref={videoRef}
          src={reel.video?.url}
          className="h-full w-full object-cover cursor-pointer"
          loop
          muted={isMuted}
          playsInline
          onClick={togglePlay}
        />

        {/* Video Dark Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/40 pointer-events-none" />

        {/* Top bar controls */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
          <button 
            onClick={onClose}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-black/45 hover:bg-black/70 text-white backdrop-blur-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <button 
            onClick={toggleMute}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-black/45 hover:bg-black/70 text-white backdrop-blur-md transition-colors"
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>

        {/* Inline Play Indicator */}
        <AnimatePresence>
          {!isPlaying && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="p-4 rounded-full bg-black/55 text-white backdrop-blur-md shadow-lg">
                <Play className="h-7 w-7 fill-current" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Side Action Icons */}
        <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4 z-20">
          {/* Reaction */}
          <div className="flex flex-col items-center gap-1">
            <button 
              onClick={toggleLike}
              className={cn(
                "h-11 w-11 flex items-center justify-center rounded-full backdrop-blur-md transition-all shadow-md active:scale-95",
                liked ? "bg-primary text-white" : "bg-black/40 text-white hover:bg-black/60"
              )}
            >
              <Heart className={cn("h-5 w-5", liked && "fill-current")} />
            </button>
            <span className="text-[10px] text-white font-bold drop-shadow">{formatCount(likeCount)}</span>
          </div>

          {/* Comments */}
          <div className="flex flex-col items-center gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }}
              className={cn(
                "h-11 w-11 flex items-center justify-center rounded-full backdrop-blur-md bg-black/40 text-white hover:bg-black/60 transition-colors shadow-md",
                showComments && "bg-white text-black"
              )}
            >
              <MessageCircle className="h-5 w-5" />
            </button>
            <span className="text-[10px] text-white font-bold drop-shadow">{formatCount(reel.commentCount)}</span>
          </div>

          {/* Share */}
          <button 
            onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }}
            className="h-11 w-11 flex items-center justify-center rounded-full backdrop-blur-md bg-black/40 text-white hover:bg-black/60 transition-colors shadow-md"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        {/* Bottom Metadata Info */}
        <div className="absolute bottom-4 left-4 right-16 z-20 space-y-3">
          <div className="flex items-center gap-2">
            <Avatar src={reel.author?.avatar} name={reel.author?.name} size="sm" isOnline={reel.author?.isOnline} />
            <div className="min-w-0">
              <p className="font-bold text-xs text-white leading-tight truncate">{reel.author?.name}</p>
              <p className="text-[10px] text-white/70 leading-none">@{reel.author?.username}</p>
            </div>
          </div>
          {reel.caption && (
            <p className="text-xs text-white/95 leading-relaxed line-clamp-2 drop-shadow-sm font-medium">
              {reel.caption.split(/(#\w+|@\w+)/g).map((part, i) => {
                if (part.startsWith('#')) {
                  return (
                    <Link
                      key={i}
                      to={`/search?q=${encodeURIComponent(part)}`}
                      className="text-primary hover:underline font-semibold"
                    >
                      {part}
                    </Link>
                  );
                }
                if (part.startsWith('@')) {
                  return (
                    <Link
                      key={i}
                      to={`/${part.slice(1)}`}
                      className="text-secondary hover:underline font-semibold"
                    >
                      {part}
                    </Link>
                  );
                }
                return part;
              })}
            </p>
          )}
        </div>
      </div>

      {/* Slide-out comments drawer on right side (Desktop/Large Screens) */}
      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 200 }}
            className="absolute md:relative inset-y-0 right-0 z-30 w-full md:w-[350px] bg-card border-l border-border flex flex-col shadow-2xl h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border/40 shrink-0">
              <span className="text-xs font-black uppercase tracking-wider text-foreground">Comments</span>
              <button 
                onClick={() => setShowComments(false)}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 bg-[#0f0f18]/30">
              <CommentSection postId={reel._id} commentCount={reel.commentCount} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <SharePostModal post={reel} onClose={() => setShowShareModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ReelsOverlayPlayer({ reels, initialReelId, onClose }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);

  // Set initial scroll index
  useEffect(() => {
    const idx = reels.findIndex((r) => r._id === initialReelId);
    if (idx !== -1) {
      setActiveIndex(idx);
      // Wait for DOM layout
      setTimeout(() => {
        if (containerRef.current) {
          const itemHeight = containerRef.current.clientHeight;
          containerRef.current.scrollTo({
            top: idx * itemHeight,
            behavior: 'auto',
          });
        }
      }, 50);
    }
  }, [initialReelId, reels]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollPos = containerRef.current.scrollTop;
    const height = containerRef.current.clientHeight;
    const newIdx = Math.round(scrollPos / height);
    if (newIdx !== activeIndex && newIdx >= 0 && newIdx < reels.length) {
      setActiveIndex(newIdx);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Scrollable container with vertical snap scroll */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none flex flex-col"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {reels.map((reel, idx) => (
          <div key={reel._id} className="w-full h-full flex-shrink-0 snap-start">
            <OverlayReelItem 
              reel={reel}
              isActive={idx === activeIndex}
              onClose={onClose}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
