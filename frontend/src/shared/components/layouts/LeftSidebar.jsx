// [auto] Left navigation sidebar
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home, Film, Users, Bookmark, Settings, Shield, Globe, ChevronRight
} from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import Avatar from '../Avatar.jsx';
import { cn } from '@/shared/utils/cn.js';

const navItems = [
  { to: '/feed', icon: Home, label: 'Home Feed' },
  { to: '/reels', icon: Film, label: 'Reels' },
  { to: '/friends', icon: Users, label: 'Friends' },
  { to: '/groups', icon: Globe, label: 'Groups' },
  { to: '/saved', icon: Bookmark, label: 'Saved Posts' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function LeftSidebar() {
  const { user } = useAuthStore();

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Profile quick access */}
      <NavLink
        to={`/${user?.username}`}
        className="flex items-center gap-3 p-3.5 rounded-2xl glass-card hover:border-primary/40 hover:shadow-md transition-all duration-300 group"
      >
        <Avatar src={user?.avatar} name={user?.name} size="md" showRing className="group-hover:scale-105 transition-transform" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">{user?.name}</p>
          <p className="text-xs text-muted-foreground truncate">@{user?.username}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/60 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
      </NavLink>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 glass-card p-2 rounded-2xl" role="navigation" aria-label="Main navigation">
        <p className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">Navigation</p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200',
                'relative overflow-hidden group cursor-pointer',
                isActive
                  ? 'text-primary bg-primary/10 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/80'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary shadow-sm shadow-primary"
                  />
                )}
                <Icon className={cn('h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                <span className="truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Admin link — only for admins/moderators */}
        {['admin', 'moderator'].includes(user?.role) && (
          <div className="pt-2 border-t border-border/40 mt-2">
            <NavLink
              to="/admin-panel"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-bold transition-all duration-200',
                  isActive
                    ? 'text-destructive bg-destructive/15'
                    : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                )
              }
            >
              <Shield className="h-5 w-5 shrink-0 text-destructive" />
              <span>{user?.role === 'admin' ? 'Admin Panel' : 'Moderator Panel'}</span>
            </NavLink>
          </div>
        )}
      </nav>

      {/* App version */}
      <div className="px-3 py-2 flex items-center justify-between text-xs text-muted-foreground/60 font-medium">
        <span>Nova Platform</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-bold text-muted-foreground border border-border/40">v1.0.0</span>
      </div>
    </div>
  );
}

