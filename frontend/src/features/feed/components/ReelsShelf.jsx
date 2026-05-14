import { useRef } from 'react';
import { Film, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import Avatar from '@/shared/components/Avatar.jsx';
import { formatCount } from '@/shared/utils/formatters.js';

export default function ReelsShelf({ reels, onSelectReel }) {
  const rowRef = useRef(null);

  const scroll = (direction) => {
    if (!rowRef.current) return;
    const scrollAmount = 300;
    rowRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!reels || reels.length === 0) return null;

  return (
    <div className="relative rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm group/shelf">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <Film className="h-4.5 w-4.5 text-primary" />
        <h2 className="text-sm font-black text-foreground uppercase tracking-wider">Reels</h2>
      </div>

      {/* Carousel Container Wrapper */}
      <div className="relative">
        {/* Left Scroll Button */}
        <button 
          onClick={() => scroll('left')}
          className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full border border-border bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover/shelf:opacity-100 transition-all duration-200 shadow-md"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-4.5 w-4.5" />
        </button>

        {/* Right Scroll Button */}
        <button 
          onClick={() => scroll('right')}
          className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full border border-border bg-black/60 hover:bg-black/85 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover/shelf:opacity-100 transition-all duration-200 shadow-md"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-4.5 w-4.5" />
        </button>

        {/* Horizontal Scrollable Row */}
        <div 
          ref={rowRef}
          className="flex gap-3 overflow-x-auto scrollbar-none snap-x snap-mandatory py-1"
        >
          {reels.map((reel) => (
            <div 
              key={reel._id}
              onClick={() => onSelectReel(reel._id)}
              className="relative w-[125px] h-[210px] md:w-[135px] md:h-[230px] rounded-xl overflow-hidden bg-zinc-950 border border-white/5 cursor-pointer snap-start shrink-0 active:scale-98 transition-transform group/card"
            >
              {/* Poster cover image */}
              <img 
                src={reel.video?.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200'}
                alt=""
                className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                loading="lazy"
              />

              {/* Dark bottom gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10 pointer-events-none" />

              {/* Author avatar overlay */}
              <div className="absolute top-2 left-2 z-10 border-2 border-primary rounded-full shadow-md">
                <Avatar src={reel.author?.avatar} name={reel.author?.name} size="xs" />
              </div>

              {/* Play overlay button */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="p-2 rounded-full bg-primary/95 text-white shadow-lg backdrop-blur-sm">
                  <Play className="h-4 w-4 fill-current" />
                </div>
              </div>

              {/* Footer Metadata */}
              <div className="absolute bottom-2 left-2 right-2 z-10 space-y-1">
                <p className="text-[10px] text-white/95 leading-tight font-semibold line-clamp-2 drop-shadow-sm">
                  {reel.caption || `Reel by @${reel.author?.username}`}
                </p>
                {reel.viewCount !== undefined && (
                  <div className="flex items-center gap-1 text-[8px] text-white/70 font-bold tracking-wide">
                    <Play className="h-2 w-2 fill-current shrink-0" />
                    <span>{formatCount(reel.viewCount)} views</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
