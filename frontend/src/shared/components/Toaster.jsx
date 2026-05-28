import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X, Loader2 } from 'lucide-react';
import { cn } from '@/shared/utils/cn.js';
import { useToastSubscription } from '@/shared/hooks/useToast.js';

const toastConfig = {
  success: {
    icon: CheckCircle,
    classes: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
    iconClass: 'text-emerald-500',
  },
  error: {
    icon: XCircle,
    classes: 'bg-destructive/10 border-destructive/30 text-destructive dark:text-red-400',
    iconClass: 'text-destructive',
  },
  info: {
    icon: Info,
    classes: 'bg-primary/10 border-primary/30 text-primary',
    iconClass: 'text-primary',
  },
  warning: {
    icon: AlertTriangle,
    classes: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400',
    iconClass: 'text-amber-500',
  },
  loading: {
    icon: Loader2,
    classes: 'bg-zinc-500/10 border-zinc-500/30 text-zinc-700 dark:text-zinc-400',
    iconClass: 'text-zinc-500 animate-spin',
  },
};

export function Toaster() {
  const { toasts, dismiss } = useToastSubscription();

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const config = toastConfig[toast.type] || toastConfig.info;
          const Icon = config.icon;

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg',
                'max-w-sm w-full glass-strong',
                config.classes
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0', config.iconClass)} />
              <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
              <button
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded-md p-0.5 opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default Toaster;
