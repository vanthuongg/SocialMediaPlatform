import { motion } from 'framer-motion';

export default function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        {/* Nova logo mark */}
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-2xl bg-nova-gradient animate-pulse-ring" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-nova-gradient shadow-nova">
            <span className="text-2xl font-black text-white">N</span>
          </div>
        </div>
        <div className="flex gap-1.5">
          {[0, 0.15, 0.3].map((delay, i) => (
            <motion.div
              key={i}
              className="h-2 w-2 rounded-full bg-primary"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 0.6, delay, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
