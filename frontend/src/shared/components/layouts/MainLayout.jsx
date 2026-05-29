// [auto] App shell layout
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useSocket } from '@/shared/hooks/useSocket.js';
import Navbar from './Navbar.jsx';
import LeftSidebar from './LeftSidebar.jsx';
import RightSidebar from './RightSidebar.jsx';
import ChatPopupManager from '../ChatPopup.jsx';
import { Home, Film, Users, Bell } from 'lucide-react';
import { cn } from '@/shared/utils/cn.js';

/**
 * Main app layout — fixed navbar, left/right sidebars, and scrollable content area.
 * Manages Socket.IO connection lifecycle.
 */
export default function MainLayout() {
  useSocket(); // Initialize Socket.IO connection
  const location = useLocation();
  const pathname = location.pathname;

  const isMessagesPage = pathname.startsWith('/messages');

  // Check if current route is a profile-related page
  const staticPaths = ['/feed', '/reels', '/messages', '/notifications', '/search', '/friends', '/saved', '/settings', '/admin-panel', '/posts', '/groups'];
  const isStaticRoute = staticPaths.some(p => pathname === p || pathname.startsWith(p + '/'));
  const isProfilePage = !isStaticRoute && pathname !== '/';

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed top navbar */}
      <Navbar />

      {/* Main content grid */}
      <div className="pt-16 mx-auto px-4 sm:px-6 lg:px-8 w-full max-w-7xl">
        <div className="flex gap-4 lg:gap-6 justify-center">
          {/* Left sidebar — navigation */}
          {!isProfilePage && (
            <aside className="hidden md:flex flex-col w-56 lg:w-64 shrink-0 sticky top-20 h-[calc(100vh-5rem)] py-3">
              <LeftSidebar />
            </aside>
          )}

          {/* Main content */}
          <main className="flex-1 min-w-0 max-w-2xl py-3 pb-20 md:pb-4">
            <Outlet />
          </main>

          {/* Right sidebar — suggestions, trends */}
          {!isMessagesPage && !isProfilePage && (
            <aside className="hidden xl:flex flex-col w-72 lg:w-80 shrink-0 sticky top-20 h-[calc(100vh-5rem)] py-3">
              <RightSidebar />
            </aside>
          )}
        </div>
      </div>


      {/* Global Chat Popups */}
      <ChatPopupManager />

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-border">
        <div className="flex items-center justify-around h-16 px-2">
          {[
            { to: '/feed', icon: Home, label: 'Home' },
            { to: '/reels', icon: Film, label: 'Reels' },
            { to: '/friends', icon: Users, label: 'Friends' },
            { to: '/notifications', icon: Bell, label: 'Alerts' },
          ].map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 p-2 rounded-xl transition-colors duration-200',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
