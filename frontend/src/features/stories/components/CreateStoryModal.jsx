import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image, Video, Type, Send, Trash2 } from 'lucide-react';
import Button from '@/shared/components/Button.jsx';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import api from '@/shared/api/axios.instance.js';
import { toast } from '@/shared/hooks/useToast.js';
import { cn } from '@/shared/utils/cn.js';

export default function CreateStoryModal({ onClose }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [mediaType, setMediaType] = useState(null); // 'image' | 'video'

  const createMutation = useMutation({
    mutationFn: () => {
      const form = new FormData();
      if (file) form.append('media', file);
      form.append('caption', caption);
      return api.post('/stories', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onMutate: () => {
      const toastId = toast.loading('Posting story...');
      return { toastId };
    },
    onSuccess: (data, variables, context) => {
      toast.success('Story posted! 🎉', { id: context?.toastId });
      qc.invalidateQueries({ queryKey: ['stories'] });
      onClose();
    },
    onError: (err, variables, context) => {
      toast.error(err.response?.data?.error?.message || 'Failed to post story', { id: context?.toastId });
    },
  });

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const type = f.type.startsWith('video/') ? 'video' : 'image';
    setFile(f);
    setMediaType(type);
    setPreview(URL.createObjectURL(f));
  };

  const clearMedia = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    setMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 16 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Create Story</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Media upload area */}
          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative h-52 rounded-2xl border-2 border-dashed border-border bg-muted/40 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
            >
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Image className="h-7 w-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Add photo or video</p>
                <p className="text-xs text-muted-foreground mt-0.5">Click to browse</p>
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-72">
              {mediaType === 'video' ? (
                <video src={preview} className="w-full h-full object-contain" controls />
              ) : (
                <img src={preview} alt="Story preview" className="w-full h-full object-contain" />
              )}
              <button
                onClick={clearMedia}
                className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                aria-label="Remove media"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileChange}
            aria-label="Upload story media"
          />

          {/* Caption */}
          <div className="space-y-1.5">
            <label htmlFor="story-caption" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Type className="h-3.5 w-3.5" />
              Caption (optional)
            </label>
            <textarea
              id="story-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption to your story..."
              rows={2}
              maxLength={200}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-right text-[10px] text-muted-foreground">{caption.length}/200</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="gradient"
            size="sm"
            onClick={() => createMutation.mutate()}
            isLoading={createMutation.isPending}
            disabled={!file && !caption.trim()}
          >
            <Send className="h-3.5 w-3.5" />
            Post Story
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
