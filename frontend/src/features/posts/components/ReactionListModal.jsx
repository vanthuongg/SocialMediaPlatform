import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Avatar from '@/shared/components/Avatar.jsx';
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axios.instance.js';

const REACTIONS = {
  like: { emoji: '👍', color: 'text-blue-500 bg-blue-100' },
  love: { emoji: '❤️', color: 'text-red-500 bg-red-100' },
  haha: { emoji: '😂', color: 'text-amber-500 bg-amber-100' },
  wow: { emoji: '😮', color: 'text-amber-500 bg-amber-100' },
  sad: { emoji: '😢', color: 'text-blue-400 bg-blue-100' },
  angry: { emoji: '😠', color: 'text-red-600 bg-red-100' },
};

export default function ReactionListModal({ postId, onClose }) {
  // In a real app, this would fetch the actual users who reacted.
  // For the mock, we can just simulate it or use the mock API.
  const { data: users, isLoading } = useQuery({
    queryKey: ['postReactions', postId],
    queryFn: () => api.get(`/posts/${postId}/reactions`).then((r) => r.data.data.reactions),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-card w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-lg">Reactions</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-accent text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Loading...</div>
          ) : users?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No reactions yet</div>
          ) : (
            users?.map((reaction, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent transition-colors cursor-pointer">
                <div className="relative">
                  <Avatar src={reaction.user?.avatar} name={reaction.user?.name} size="md" />
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] border-2 border-card ${REACTIONS[reaction.type]?.color}`}>
                    {REACTIONS[reaction.type]?.emoji}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{reaction.user?.name}</p>
                  <p className="text-xs text-muted-foreground">{reaction.user?.bio?.substring(0, 30)}...</p>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
