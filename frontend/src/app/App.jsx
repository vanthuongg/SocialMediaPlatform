import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import AppRouter from './router.jsx';
import { Toaster } from '@/shared/components/Toaster.jsx';
import { useThemeInit } from '@/shared/hooks/useTheme.js';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import PageLoader from '@/shared/components/PageLoader.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

function ThemeInitializer({ children }) {
  useThemeInit();
  return children;
}

// Module-level singleton — survives StrictMode remounts and socket reconnects.
// Ensures /auth/refresh-token is called exactly once per page load.
let _refreshPromise = null;
function getRefreshPromise() {
  if (!_refreshPromise) {
    _refreshPromise = axios
      .post('/api/v1/auth/refresh-token', {}, { withCredentials: true })
      .then((res) => res.data.data.accessToken)
      .catch(() => null); // null signals "no valid session"
  }
  return _refreshPromise;
}

/**
 * Silently refreshes the access token once per page load using the httpOnly cookie.
 * Renders nothing until the refresh attempt completes so child routes always have a token.
 */
function AuthInitializer({ children }) {
  const [ready, setReady] = useState(false);
  const { isAuthenticated, setAccessToken, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      setReady(true);
      return;
    }

    getRefreshPromise().then((token) => {
      if (token) {
        setAccessToken(token);
      } else {
        logout();
      }
      setReady(true);
    });
  }, []); // intentionally empty — run once per mount lifecycle

  if (!ready) return <PageLoader />;
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeInitializer>
          <AuthInitializer>
            <AppRouter />
            <Toaster />
          </AuthInitializer>
        </ThemeInitializer>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
