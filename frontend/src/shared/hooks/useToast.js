import { useState, useEffect, useCallback } from 'react';

/**
 * Minimal toast notification system using Zustand-compatible pattern.
 * Supports loading state, custom toast IDs, and updating existing toasts.
 */
let toastListeners = [];
let toastId = 0;
let activeToasts = [];
let timeouts = {};

function emit(action) {
  toastListeners.forEach((listener) => listener(action));
}

export const toast = {
  success: (message, options = {}) => {
    const id = options.id || ++toastId;
    emit({ type: 'ADD_OR_UPDATE', toast: { id, type: 'success', message, duration: options.duration || 4000 } });
    return id;
  },
  error: (message, options = {}) => {
    const id = options.id || ++toastId;
    emit({ type: 'ADD_OR_UPDATE', toast: { id, type: 'error', message, duration: options.duration || 4000 } });
    return id;
  },
  info: (message, options = {}) => {
    const id = options.id || ++toastId;
    emit({ type: 'ADD_OR_UPDATE', toast: { id, type: 'info', message, duration: options.duration || 4000 } });
    return id;
  },
  warning: (message, options = {}) => {
    const id = options.id || ++toastId;
    emit({ type: 'ADD_OR_UPDATE', toast: { id, type: 'warning', message, duration: options.duration || 4000 } });
    return id;
  },
  loading: (message, options = {}) => {
    const id = options.id || ++toastId;
    // Loading toasts do not auto-dismiss by default or have very long timeout (120s)
    emit({ type: 'ADD_OR_UPDATE', toast: { id, type: 'loading', message, duration: options.duration || 120000 } });
    return id;
  },
  dismiss: (id) => {
    emit({ type: 'DISMISS', id });
  },
};

export function useToastSubscription() {
  const [toasts, setToasts] = useState([]);

  const handleAction = useCallback((action) => {
    if (action.type === 'ADD_OR_UPDATE') {
      const newToast = action.toast;

      // Clear existing timeout if any
      if (timeouts[newToast.id]) {
        clearTimeout(timeouts[newToast.id]);
        delete timeouts[newToast.id];
      }

      setToasts((prev) => {
        const exists = prev.some((t) => t.id === newToast.id);
        let nextToasts;
        if (exists) {
          nextToasts = prev.map((t) => (t.id === newToast.id ? newToast : t));
        } else {
          nextToasts = [...prev, newToast];
        }
        activeToasts = nextToasts;
        return nextToasts;
      });

      // Loading toasts don't dismiss until updated or dismissed manually
      if (newToast.type !== 'loading') {
        timeouts[newToast.id] = setTimeout(() => {
          setToasts((prev) => {
            const nextToasts = prev.filter((t) => t.id !== newToast.id);
            activeToasts = nextToasts;
            return nextToasts;
          });
          delete timeouts[newToast.id];
        }, newToast.duration);
      }
    } else if (action.type === 'DISMISS') {
      if (timeouts[action.id]) {
        clearTimeout(timeouts[action.id]);
        delete timeouts[action.id];
      }
      setToasts((prev) => {
        const nextToasts = prev.filter((t) => t.id !== action.id);
        activeToasts = nextToasts;
        return nextToasts;
      });
    }
  }, []);

  useEffect(() => {
    toastListeners.push(handleAction);
    setToasts(activeToasts);

    return () => {
      toastListeners = toastListeners.filter((listener) => listener !== handleAction);
    };
  }, [handleAction]);

  const dismiss = useCallback((id) => {
    if (timeouts[id]) {
      clearTimeout(timeouts[id]);
      delete timeouts[id];
    }
    setToasts((prev) => {
      const nextToasts = prev.filter((t) => t.id !== id);
      activeToasts = nextToasts;
      return nextToasts;
    });
  }, []);

  return { toasts, dismiss };
}
