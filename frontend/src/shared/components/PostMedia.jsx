import { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { cn } from '@/shared/utils/cn.js';
import MediaLightbox from './MediaLightbox.jsx';

export default function PostMedia({ media }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!media || media.length === 0) return null;

  const openLightbox = (index) => {
    setActiveIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <div className={cn('mt-3 grid gap-1.5 overflow-hidden rounded-2xl', media.length > 1 ? 'grid-cols-2' : '')}>
        {media.slice(0, 4).map((item, i) => (
          <div
            key={i}
            className={cn(
              'relative bg-muted overflow-hidden group',
              media.length === 1 ? 'aspect-[16/9]' : 'aspect-square',
              media.length === 3 && i === 0 ? 'row-span-2' : ''
            )}
          >
            {item.type === 'video' ? (
              <div className="relative w-full h-full">
                <video
                  src={item.url}
                  controls
                  className="w-full h-full object-cover"
                  preload="metadata"
                />
                {/* Maximize Button overlay for video */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openLightbox(i);
                  }}
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-opacity duration-200 opacity-0 group-hover:opacity-100 z-10 shadow-md focus:opacity-100"
                  title="Expand Video"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={() => openLightbox(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    openLightbox(i);
                  }
                }}
                className="relative w-full h-full cursor-zoom-in overflow-hidden"
              >
                <img
                  src={item.url}
                  alt={`Post media ${i + 1}`}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                {/* Maximize Icon overlay for images */}
                <div className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white transition-opacity duration-200 opacity-0 group-hover:opacity-100 z-10 shadow-md pointer-events-none">
                  <Maximize2 className="h-3.5 w-3.5" />
                </div>
              </div>
            )}

            {/* Over-overlay for 4+ items */}
            {i === 3 && media.length > 4 && (
              <div 
                role="button"
                tabIndex={0}
                onClick={() => openLightbox(3)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    openLightbox(3);
                  }
                }}
                className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center cursor-pointer hover:bg-black/75 transition-colors duration-200 z-10"
              >
                <span className="text-2xl font-black text-white">+{media.length - 4}</span>
                <span className="text-[10px] font-semibold text-zinc-300 mt-1 uppercase tracking-wider">Xem tất cả</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <MediaLightbox
        media={media}
        initialIndex={activeIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
