import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, FileText, Video, Flag, Settings,
  LogOut, Shield, ChevronRight, BarChart2, Home, Layers
} from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import { cn } from '@/shared/utils/cn.js';
import api from '@/shared/api/axios.instance.js';
import { toast } from '@/shared/hooks/useToast.js';
import Avatar from '@/shared/components/Avatar.jsx';

const NAV_ITEMS = [
  { to: '/admin-panel',           label: 'Overview',   icon: LayoutDashboard, exact: true,  roles: ['admin', 'moderator'] },
  { to: '/admin-panel/users',     label: 'Users',      icon: Users,           exact: false, roles: ['admin'] },
  { to: '/admin-panel/posts',     label: 'Posts',      icon: FileText,        exact: false, roles: ['admin', 'moderator'] },
  { to: '/admin-panel/reels',     label: 'Reels',      icon: Video,           exact: false, roles: ['admin', 'moderator'] },
  { to: '/admin-panel/groups',    label: 'Groups',     icon: Layers,          exact: false, roles: ['admin', 'moderator'] },
  { to: '/admin-panel/reports',   label: 'Reports',    icon: Flag,            exact: false, roles: ['admin', 'moderator'] },
  { to: '/admin-panel/settings',  label: 'Settings',   icon: Settings,        exact: false, roles: ['admin'] },
];

function SidebarLink({ to, label, icon: Icon, exact }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) => cn(
        'group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      )}
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('h-5 w-5 shrink-0 transition-transform duration-200', !isActive && 'group-hover:scale-110')} />
          <span className="flex-1">{label}</span>
          {isActive && <ChevronRight className="h-4 w-4 opacity-60" />}
        </>
      )}
    </NavLink>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(user?.role)).map(item => {
    if (item.to === '/admin-panel' && user?.role === 'moderator') {
      return { ...item, label: 'Dashboard' };
    }
    if (item.to === '/admin-panel/posts' && user?.role === 'moderator') {
      return { ...item, label: 'Post Moderation' };
    }
    if (item.to === '/admin-panel/reels' && user?.role === 'moderator') {
      return { ...item, label: 'Reel Moderation' };
    }
    if (item.to === '/admin-panel/groups' && user?.role === 'moderator') {
      return { ...item, label: 'Group Moderation' };
    }
    if (item.to === '/admin-panel/reports' && user?.role === 'moderator') {
      return { ...item, label: 'Report Queue' };
    }
    return item;
  });

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (_) { /* ignore */ }
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#0a0a12] overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-64 shrink-0 flex flex-col border-r border-white/5 bg-[#0d0d1a]">
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">
              {user?.role === 'admin' ? 'Admin Panel' : 'Moderator Panel'}
            </p>
            <p className="text-[10px] text-slate-500 capitalize">{user?.role} access</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNav.map(item => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </nav>

        {/* Divider */}
        <div className="px-3 py-2">
          <div className="h-px bg-white/5" />
        </div>

        {/* Go to site */}
        <div className="px-3 pb-2">
          <NavLink
            to="/feed"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200 group"
          >
            <Home className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
            Back to site
          </NavLink>
        </div>

        {/* User profile */}
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors duration-200">
            <Avatar src={user?.avatar} name={user?.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">@{user?.username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-200"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header bar */}
        <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-white/5 bg-[#0d0d1a]/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <BarChart2 className="h-3.5 w-3.5" />
            <span>Nova Social</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white font-medium">
              {user?.role === 'admin' ? 'Admin Panel' : 'Moderator Panel'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25 font-medium capitalize">
              {user?.role}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <motion.div
            key={window.location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
