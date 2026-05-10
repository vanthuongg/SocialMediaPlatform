import { useEffect } from 'react';
import { useThemeStore } from '@/shared/stores/theme.store.js';

export function useTheme() {
  const { theme, setTheme, toggleTheme } = useThemeStore();
  const isDark = document.documentElement.classList.contains('dark');

  return { theme, isDark, setTheme, toggleTheme };
}

/**
 * Initializes theme from persisted store on app mount.
 * Call once at the root level.
 */
export function useThemeInit() {
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    setTheme(theme);

    // Listen for system preference changes
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') setTheme('system');
    };
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [theme]);
}
