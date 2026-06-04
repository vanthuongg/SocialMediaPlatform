import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

export default function MediaLightbox({ media, initialIndex = 0, open, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);

  // Sync index when initialIndex or media changes
  useEffect(() => {
    if (open) {
      setIndex(initialIndex);
      resetZoom();
    }
  }, [initialIndex, open]);

  // Handle keyboard events (ESC, ArrowLeft, ArrowRight)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, index, media]);

  // Register wheel zoom on containerRef with passive: false to allow preventDefault
  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        setScale((s) => Math.min(5, s + 0.2));
      } else {
        setScale((s) => Math.max(0.5, s - 0.2));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [open]);

  const resetZoom = () => {
    setScale(1);
  };

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    if (media.length <= 1) return;
    setIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
    resetZoom();
  };

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    if (media.length <= 1) return;
    setIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
    resetZoom();
  };

  const zoomIn = (e) => {
    if (e) e.stopPropagation();
    setScale((s) => Math.min(5, s + 0.25));
  };

  const zoomOut = (e) => {
    if (e) e.stopPropagation();
    setScale((s) => Math.max(0.5, s - 0.25));
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2.5);
    }
  };

  const currentMedia = media?.[index];

  if (!open || !currentMedia) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 text-white select-none backdrop-blur-sm"
        aria-modal="true"
        role="dialog"
      >
        {/* Top Header / Control Bar */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/85 to-transparent z-30">
          <div className="text-sm font-semibold text-zinc-400">
            {index + 1} / {media.length}
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Out Button */}
            <button
              onClick={zoomOut}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
              title="Zoom Out"
            >
              <ZoomOut className="h-5 w-5" />
            </button>

            {/* Scale Percent Indicator */}
            <span className="text-xs font-mono font-semibold w-12 text-center text-zinc-300">
              {Math.round(scale * 100)}%
            </span>

            {/* Zoom In Button */}
            <button
              onClick={zoomIn}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
              title="Zoom In"
            >
              <ZoomIn className="h-5 w-5" />
            </button>

            {/* Reset Zoom Button */}
            {scale !== 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); resetZoom(); }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
                title="Reset Zoom"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            )}

            <div className="w-[1px] h-6 bg-white/20 mx-1" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary text-white"
              title="Close (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Media Viewing Canvas */}
        <div
          ref={containerRef}
          className="flex-1 relative flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
          onClick={onClose}
        >
          {/* Previous Media Arrow */}
          {media.length > 1 && (
            <button
              onClick={handlePrev}
              className="absolute left-4 p-3 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-white transition-all duration-200 z-30 focus:outline-none focus:ring-2 focus:ring-primary"
              title="Previous"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Draggable Media Wrapper */}
          <div 
            className="w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={handleDoubleClick}
          >
            <motion.div
              key={index} // Reset drag offset on media changes
              drag={scale > 1}
              dragConstraints={{ left: -1200, right: 1200, top: -800, bottom: 800 }}
              dragElastic={0.15}
              animate={{ scale }}
              transition={scale === 1 ? { type: 'spring', damping: 25, stiffness: 200 } : { duration: 0.1 }}
              className="max-w-full max-h-[80vh] flex items-center justify-center select-none"
            >
              {currentMedia.type === 'video' ? (
                <video
                  src={currentMedia.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                  style={{ pointerEvents: scale > 1 ? 'none' : 'auto' }}
                />
              ) : (
                <img
                  src={currentMedia.url}
                  alt={`Lightbox media ${index + 1}`}
                  draggable={false}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl select-none pointer-events-none"
                />
              )}
            </motion.div>
          </div>

          {/* Next Media Arrow */}
          {media.length > 1 && (
            <button
              onClick={handleNext}
              className="absolute right-4 p-3 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-white transition-all duration-200 z-30 focus:outline-none focus:ring-2 focus:ring-primary"
              title="Next"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Footer info/tips bar */}
        <div className="p-4 text-center text-xs text-zinc-400 bg-gradient-to-t from-black/85 to-transparent z-10">
          <span>Cuộn chuột để zoom | Nhấp đúp để phóng to/thu nhỏ nhanh | Kéo để di chuyển</span>
        </div>
      </div>
    </AnimatePresence>
  );
}
