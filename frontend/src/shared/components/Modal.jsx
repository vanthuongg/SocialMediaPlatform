// [auto] Accessible modal component
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/shared/utils/cn.js';
import { motion, AnimatePresence } from 'framer-motion';

export function Modal({ open, onOpenChange, title, description, children, className, size = 'md' }) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-screen-lg',
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            {/* Backdrop overlay */}
            <DialogPrimitive.Overlay forceMount asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => onOpenChange?.(false)}
              />
            </DialogPrimitive.Overlay>

            {/* Modal content */}
            <DialogPrimitive.Content forceMount asChild>
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none focus:outline-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div
                  className={cn(
                    'relative w-full pointer-events-auto rounded-3xl border border-white/20 dark:border-white/10 bg-card/95 dark:bg-card/95 backdrop-blur-2xl shadow-2xl shadow-primary/10 overflow-hidden',
                    sizeClasses[size],
                    className
                  )}
                  initial={{ scale: 0.94, y: 12, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.94, y: 12, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Header */}
                  {(title || description) && (
                    <div className="px-6 pt-6 pb-4 border-b border-border/60 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
                      {title && (
                        <DialogPrimitive.Title className="text-lg font-bold tracking-tight text-foreground">
                          {title}
                        </DialogPrimitive.Title>
                      )}
                      {description && (
                        <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground/80">
                          {description}
                        </DialogPrimitive.Description>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-6">{children}</div>

                  {/* Close button */}
                  <DialogPrimitive.Close
                    className={cn(
                      'absolute right-4 top-4 rounded-full p-2',
                      'text-muted-foreground hover:text-foreground hover:bg-accent/80 hover:scale-105 active:scale-95',
                      'transition-all duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    )}
                    aria-label="Close modal"
                  >
                    <X className="h-4.5 w-4.5" />
                  </DialogPrimitive.Close>
                </motion.div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

export default Modal;

