// [auto] Auth pages wrapper
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

/**
 * Auth layout — centered card with gradient background for login/register/forgot pages.
 */
export default function AuthLayout() {
  return (
    <div className="min-h-screen flex bg-background selection:bg-primary/30">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-center px-16 w-[500px] shrink-0 bg-nova-gradient relative overflow-hidden shadow-2xl z-10">
        {/* Ambient background decoration */}
        <div className="absolute inset-0 opacity-25">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-white/40"
              style={{
                width: `${(i + 1) * 140}px`,
                height: `${(i + 1) * 140}px`,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 25 + i * 5, repeat: Infinity, ease: 'linear' }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10"
        >
          {/* Logo */}
          <div className="flex items-center gap-3.5 mb-10">
            <div className="h-13 w-13 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30 shadow-lg">
              <span className="text-2xl font-black text-white">N</span>
            </div>
            <span className="text-4xl font-black text-white tracking-tight">Nova</span>
          </div>

          <h1 className="text-5xl font-black text-white leading-tight mb-5 tracking-tight">
            Connect.<br />Share.<br />Shine.
          </h1>
          <p className="text-white/80 text-lg leading-relaxed font-medium max-w-sm">
            Join millions of people sharing moments, building vibrant communities, and shining together.
          </p>

          {/* Stats */}
          <div className="mt-12 flex gap-8 pt-8 border-t border-white/20">
            {[
              { label: 'Active users', value: '2M+' },
              { label: 'Posts daily', value: '500K+' },
              { label: 'Countries', value: '120+' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-black text-white tracking-tight">{stat.value}</div>
                <div className="text-white/70 text-xs font-semibold uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto relative bg-gradient-to-br from-background via-background/95 to-primary/5">
        <div className="w-full max-w-md my-auto">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden justify-center">
            <div className="h-11 w-11 rounded-2xl bg-nova-gradient flex items-center justify-center shadow-md">
              <span className="text-2xl font-black text-white">N</span>
            </div>
            <span className="text-3xl font-black text-gradient">Nova</span>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
}

