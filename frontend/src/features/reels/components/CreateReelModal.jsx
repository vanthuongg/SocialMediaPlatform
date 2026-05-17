import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Video, Globe, Users, Lock, Sparkles } from 'lucide-react';
import api from '@/shared/api/axios.instance.js';
import Avatar from '@/shared/components/Avatar.jsx';
import Button from '@/shared/components/Button.jsx';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import { toast } from '@/shared/hooks/useToast.js';
import { cn } from '@/shared/utils/cn.js';

const VISIBILITY_OPTIONS = [
  { value: 'public', icon: Globe, label: 'Công khai' },
  { value: 'friends', icon: Users, label: 'Bạn bè' },
  { value: 'private', icon: Lock, label: 'Chỉ mình tôi' },
];

export default function CreateReelModal({ onClose }) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [caption, setCaption] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [visibility, setVisibility] = useState('public');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const createReelMutation = useMutation({
    mutationFn: (formData) =>
      api.post('/reels', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    onMutate: () => {
      const toastId = toast.loading('Uploading reel...');
      return { toastId };
    },
    onSuccess: (data, variables, context) => {
      toast.success('Đã đăng Reel của bạn thành công! 🎉', { id: context?.toastId });
      queryClient.invalidateQueries({ queryKey: ['reels'] });
      onClose();
    },
    onError: (err, variables, context) => {
      toast.error(err.response?.data?.error?.message || 'Không thể tải lên thước phim', { id: context?.toastId });
    },
  });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Vui lòng chọn một tệp video hợp lệ (MP4, WebM, v.v.)');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error('Kích thước video không được vượt quá 100MB');
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e);
  };

  const removeVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoFile(null);
    setVideoPreview(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!videoFile) {
      toast.error('Vui lòng chọn một tệp video trước khi đăng');
      return;
    }

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('caption', caption);
    formData.append('visibility', visibility);

    createReelMutation.mutate(formData);
  };

  const isPending = createReelMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl bg-[#11111b] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[90vh] md:h-auto md:max-h-[85vh]"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isPending}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white border border-white/10 hover:scale-110 active:scale-95 transition-all"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Left Side: Video Drag/Drop or Preview (9:16 aspect preview) */}
        <div className="flex-1 bg-black/40 flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-white/5 relative min-h-[300px] md:min-h-[500px]">
          {!videoPreview ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'w-full max-w-[280px] aspect-[9/16] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 group',
                isDragging
                  ? 'border-primary bg-primary/5 scale-105'
                  : 'border-white/10 hover:border-violet-500/50 hover:bg-white/[0.02]'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="h-14 w-14 rounded-full bg-violet-600/10 text-violet-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">Tải video lên</p>
              <p className="text-xs text-slate-500 px-4 leading-relaxed">
                Kéo & thả video của bạn vào đây hoặc nhấp để duyệt tệp.
              </p>
              <div className="mt-6 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-[10px] text-slate-400 font-medium border border-white/5">
                <Video className="h-3.5 w-3.5" />
                <span>Hỗ trợ MP4, WebM (Tối đa 100MB)</span>
              </div>
            </div>
          ) : (
            <div className="relative w-full max-w-[280px] aspect-[9/16] rounded-2xl overflow-hidden bg-black shadow-lg border border-white/10 group">
              <video
                src={videoPreview}
                className="h-full w-full object-cover"
                controls
                playsInline
              />
              {!isPending && (
                <button
                  type="button"
                  onClick={removeVideo}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md"
                  title="Xóa video"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Metadata / Form */}
        <form
          onSubmit={handleSubmit}
          className="w-full md:w-[380px] p-6 md:p-8 flex flex-col justify-between bg-card/10 backdrop-blur-sm"
        >
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-400" /> Tạo Reels mới
              </h2>
              <p className="text-xs text-slate-500 mt-1">Chia sẻ thước phim sáng tạo của bạn đến cộng đồng</p>
            </div>

            {/* Author profile */}
            <div className="flex items-center gap-3">
              <Avatar src={user?.avatar} name={user?.name} size="sm" />
              <div>
                <p className="text-sm font-semibold text-white">{user?.name}</p>
                <p className="text-xs text-slate-500">@{user?.username}</p>
              </div>
            </div>

            {/* Caption Textarea */}
            <div className="space-y-2">
              <label htmlFor="caption" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Chú thích
              </label>
              <textarea
                id="caption"
                rows={4}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Nhập nội dung thước phim... Hãy gắn thêm #hashtag hoặc tag @banbe!"
                disabled={isPending}
                className="w-full bg-[#161622] border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors resize-none leading-relaxed"
              />
              <div className="flex justify-between items-center text-[10px] text-slate-600">
                <span>Nhận diện tự động các hashtag & mentions</span>
                <span>{caption.length}/500</span>
              </div>
            </div>

            {/* Visibility Options */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Quyền riêng tư
              </label>
              <div className="grid grid-cols-3 gap-2">
                {VISIBILITY_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const selected = visibility === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={isPending}
                      onClick={() => setVisibility(opt.value)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all duration-200',
                        selected
                          ? 'bg-violet-600/10 text-violet-400 border-violet-500/40 shadow-md shadow-violet-500/5'
                          : 'bg-white/[0.02] text-slate-400 border-white/5 hover:bg-white/[0.04]'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5 mt-6 flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isPending}
              className="flex-1"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="gradient"
              disabled={!videoFile || isPending}
              isLoading={isPending}
              className="flex-1 shadow-lg shadow-violet-500/25"
            >
              Đăng ngay
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
