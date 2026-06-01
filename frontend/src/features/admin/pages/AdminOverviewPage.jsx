import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users, FileText, Flag, TrendingUp,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import api from '@/shared/api/axios.instance.js';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import { Skeleton } from '@/shared/components/Skeleton.jsx';
import { formatCount } from '@/shared/utils/formatters.js';
import { cn } from '@/shared/utils/cn.js';

function StatCard({ label, value, icon: Icon, gradient, change }) {
  const isUp = change >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#13131f] p-5"
    >
      {/* Background glow */}
      <div className={cn('absolute inset-0 opacity-10 rounded-2xl', gradient)} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{label}</p>
          <p className="text-3xl font-black text-white">{formatCount(value)}</p>
          {change !== undefined && (
            <p className={cn('flex items-center gap-1 mt-1.5 text-xs font-medium', isUp ? 'text-emerald-400' : 'text-red-400')}>
              {isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(change)} today
            </p>
          )}
        </div>
        <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center', gradient)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs text-slate-400 mb-2 font-medium">{label}</p>
      {payload.map(entry => (
        <p key={entry.dataKey} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

export default function AdminOverviewPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api.get('/admin/dashboard').then(r => r.data.data.stats),
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => api.get('/admin/analytics').then(r => r.data.data.analytics),
    enabled: isAdmin,
  });

  const statCards = [
    { label: 'Total Users',       value: stats?.totalUsers    || 0, icon: Users,     gradient: 'bg-gradient-to-br from-violet-600 to-indigo-600', change: stats?.newUsersToday },
    { label: 'Total Posts',       value: stats?.totalPosts    || 0, icon: FileText,   gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
    { label: 'Pending Reports',   value: stats?.pendingReports|| 0, icon: Flag,       gradient: 'bg-gradient-to-br from-amber-500 to-orange-600' },
    { label: 'New Users Today',   value: stats?.newUsersToday || 0, icon: TrendingUp, gradient: 'bg-gradient-to-br from-blue-500 to-cyan-600' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Overview</h1>
        <p className="text-sm text-slate-500 mt-1">Platform snapshot and activity trends</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl bg-white/5" />)
          : statCards.map((card, i) => (
            <motion.div key={card.label} transition={{ delay: i * 0.06 }}>
              <StatCard {...card} />
            </motion.div>
          ))
        }
      </div>

      {/* Activity chart — admin only */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-white/5 bg-[#13131f] p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-white">7-Day Activity</h2>
              <p className="text-xs text-slate-500 mt-0.5">New users and posts per day</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20 font-medium">
              Last 7 days
            </span>
          </div>

          {analyticsLoading ? (
            <Skeleton className="h-56 rounded-xl bg-white/5" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={analytics} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradPosts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 12 }} />
                <Area type="monotone" dataKey="newUsers" name="New Users" stroke="#7c3aed" fill="url(#gradUsers)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="newPosts" name="New Posts" stroke="#10b981" fill="url(#gradPosts)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      )}
    </div>
  );
}
