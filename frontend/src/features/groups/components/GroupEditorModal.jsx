import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X, Image, Film, Send } from 'lucide-react';
import api from '@/shared/api/axios.instance.js';
import Button from '@/shared/components/Button.jsx';
import { toast } from '@/shared/hooks/useToast.js';

export default function GroupEditorModal({ groupId, onClose, onSuccess }) {
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setMediaFiles((prev) => [...prev, ...files]);

    const newPreviews = files.map((file) => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
    }));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (index) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const createPostMutation = useMutation({
    mutationFn: (formData) =>
      api.post(`/groups/${groupId}/posts`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Post submitted');
      previews.forEach((p) => URL.revokeObjectURL(p.url));
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to submit post');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim() && mediaFiles.length === 0) {
      return toast.error('Post must have content or media');
    }

    const formData = new FormData();
    formData.append('content', content);
    mediaFiles.forEach((file) => {
      formData.append('media', file);
    });

    createPostMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 16 }}
        className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Create Group Post</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What would you like to share with this community?"
            rows={5}
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-sm leading-relaxed focus:outline-none resize-none border-none p-0"
            autoFocus
          />

          {/* Media previews */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto">
              {previews.map((preview, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border/40">
                  {preview.type === 'video' ? (
                    <video src={preview.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={preview.url} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Attachment Bar */}
          <div className="flex items-center justify-between border border-border/40 p-2.5 rounded-xl bg-muted/20">
            <span className="text-xs text-muted-foreground font-semibold">Add to your post</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                title="Add Image or Video"
              >
                <Image className="h-4 w-4" />
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 justify-end pt-2 border-t border-border/40">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="gradient"
              size="sm"
              type="submit"
              className="flex items-center gap-1 shadow-nova-sm"
              isLoading={createPostMutation.isPending}
            >
              <Send className="h-3.5 w-3.5" /> Submit Post
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
