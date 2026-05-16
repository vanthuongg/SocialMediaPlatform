// [auto] Post editor with media upload
import { useState, useRef, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image, X, Smile, Globe, Users, Lock, Send, UserPlus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Popover from '@radix-ui/react-popover';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import Avatar from '@/shared/components/Avatar.jsx';
import Button from '@/shared/components/Button.jsx';
import api from '@/shared/api/axios.instance.js';
import { toast } from '@/shared/hooks/useToast.js';
import { cn } from '@/shared/utils/cn.js';

const EMOJIS = ['😀', '😂', '🥰', '😎', '😭', '😡', '👍', '❤️', '🔥', '✨', '🎉', '🙌', '🤔', '👀', '💯', '🙏'];

const VISIBILITY_OPTIONS = [
  { value: 'public', icon: Globe, label: 'Public' },
  { value: 'friends', icon: Users, label: 'Friends' },
  { value: 'private', icon: Lock, label: 'Only me' },
];

export default function PostEditor({ onSuccess, isModal = false }) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [visibility, setVisibility] = useState('public');
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Tagging State
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [friendSearch, setFriendSearch] = useState('');

  // Fetch friends list for tagging
  const { data: friendsData } = useQuery({
    queryKey: ['tagging-friends'],
    queryFn: () => api.get('/users/me/friends').then((r) => r.data.data),
    staleTime: 60_000,
  });

  const friendsList = useMemo(() => {
    if (!friendsData) return [];
    return Array.isArray(friendsData) ? friendsData : (friendsData.friends || []);
  }, [friendsData]);

  const filteredFriends = useMemo(() => {
    if (!friendSearch.trim()) return friendsList;
    const q = friendSearch.toLowerCase();
    return friendsList.filter((f) => f.name?.toLowerCase().includes(q) || f.username?.toLowerCase().includes(q));
  }, [friendsList, friendSearch]);

  const toggleTagFriend = (friend) => {
    setTaggedUsers((prev) => {
      if (prev.some((u) => u._id === friend._id)) {
        return prev.filter((u) => u._id !== friend._id);
      }
      return [...prev, friend];
    });
  };

  const createPostMutation = useMutation({
    mutationFn: (formData) => api.post('/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onMutate: () => {
      const toastId = toast.loading('Publishing post...');
      return { toastId };
    },
    onSuccess: (data, variables, context) => {
      toast.success('Post published! 🎉', { id: context?.toastId });
      setContent('');
      setFiles([]);
      setPreviews([]);
      setTaggedUsers([]);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
      onSuccess?.();
    },
    onError: (err, variables, context) => {
      toast.error(err.response?.data?.error?.message || 'Failed to publish post', { id: context?.toastId });
    },
  });

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || e.dataTransfer.files);
    const newPreviews = selected.map((f) => ({
      url: URL.createObjectURL(f),
      type: f.type.startsWith('video/') ? 'video' : 'image',
      name: f.name,
    }));
    setFiles((prev) => [...prev, ...selected]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    if (e.target.value) e.target.value = '';
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e);
    }
  };

  const removeFile = (index) => {
    URL.revokeObjectURL(previews[index].url);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!content.trim() && files.length === 0) return;

    const formData = new FormData();
    formData.append('content', content);
    formData.append('visibility', visibility);
    files.forEach((f) => formData.append('media', f));
    taggedUsers.forEach((u) => formData.append('mentions', u._id));

    createPostMutation.mutate(formData);
  };

  const isPending = createPostMutation.isPending;

  return (
    <div 
      className={cn(
        isModal 
          ? "relative transition-colors duration-200" 
          : "rounded-3xl glass-card p-4.5 mb-6 transition-all duration-300 relative border border-border/60 shadow-sm",
        isDragging 
          ? "border-2 border-dashed border-primary bg-primary/5 p-4" 
          : ""
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-background/80 backdrop-blur-md border-2 border-dashed border-primary">
          <p className="text-lg font-bold text-primary flex items-center gap-2">
            <Image className="h-6 w-6" /> Drop files here
          </p>
        </div>
      )}

      {/* Author Header Row */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar src={user?.avatar} name={user?.name} size="md" />
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-foreground">{user?.name}</span>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="text-xs px-2.5 py-1 rounded-full border border-border/60 bg-muted/60 text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer font-bold transition-all"
            aria-label="Post visibility"
          >
            {VISIBILITY_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Text area */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={`What's on your mind, ${user?.name?.split(' ')[0]}?`}
        rows={isFocused || content ? 3 : 2}
        className={cn(
          'w-full resize-none bg-transparent text-foreground placeholder:text-muted-foreground/60',
          'text-sm leading-relaxed focus:outline-none transition-all duration-200 font-medium py-1'
        )}
        aria-label="Post content"
      />

      {/* Tagged users chips */}
      {taggedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2 p-2 bg-muted/40 rounded-2xl border border-border/40">
          <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider self-center mr-1">With:</span>
          {taggedUsers.map((u) => (
            <div key={u._id} className="flex items-center gap-1 bg-primary/15 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full">
              <span>{u.name}</span>
              <button
                type="button"
                onClick={() => toggleTagFriend(u)}
                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors text-primary ml-0.5 cursor-pointer"
                aria-label={`Untag ${u.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Media previews */}
      <AnimatePresence>
        {previews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              'grid gap-2 mt-3',
              previews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
            )}
          >
            {previews.map((preview, index) => (
              <div key={index} className="relative group rounded-2xl overflow-hidden aspect-video bg-muted border border-border/50">
                {preview.type === 'video' ? (
                  <video src={preview.url} className="w-full h-full object-cover" />
                ) : (
                  <img src={preview.url} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-black/80 cursor-pointer"
                  aria-label="Remove media"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions row */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
        <div className="flex gap-1.5 items-center">
          {/* Media attach */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
            aria-label="Attach media"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-9 w-9 flex items-center justify-center rounded-2xl text-primary hover:bg-primary/15 transition-all cursor-pointer"
            aria-label="Add photos/videos"
          >
            <Image className="h-5 w-5" />
          </button>

          {/* Tag friends */}
          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                className="h-9 w-9 flex items-center justify-center rounded-2xl text-indigo-500 hover:bg-indigo-500/15 transition-all relative cursor-pointer"
                aria-label="Tag friends"
              >
                <UserPlus className="h-5 w-5" />
                {taggedUsers.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                    {taggedUsers.length}
                  </span>
                )}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content 
                className="z-50 w-64 p-3.5 bg-card/95 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl outline-none"
                sideOffset={5}
                align="center"
              >
                <p className="text-xs font-bold text-foreground mb-2">Tag Friends</p>
                <input
                  type="text"
                  placeholder="Search friends..."
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                  className="w-full h-8.5 px-3 mb-2 rounded-xl bg-muted/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 border border-border/50"
                />
                <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-hide">
                  {filteredFriends.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground py-4 text-center italic">No friends found</p>
                  ) : (
                    filteredFriends.map((friend) => {
                      const isTagged = taggedUsers.some((u) => u._id === friend._id);
                      return (
                        <button
                          key={friend._id}
                          type="button"
                          onClick={() => toggleTagFriend(friend)}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left text-xs transition-all cursor-pointer",
                            isTagged ? "bg-primary/15 text-primary font-bold" : "hover:bg-accent/80 text-foreground"
                          )}
                        >
                          <Avatar src={friend.avatar} name={friend.name} size="xs" />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold truncate leading-tight">{friend.name}</p>
                            <p className="text-[9px] text-muted-foreground truncate">@{friend.username}</p>
                          </div>
                          {isTagged && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
                <Popover.Arrow className="fill-border" />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          {/* Emoji Picker */}
          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                className="h-9 w-9 flex items-center justify-center rounded-2xl text-amber-500 hover:bg-amber-500/15 transition-all cursor-pointer"
                aria-label="Add emoji"
              >
                <Smile className="h-5 w-5" />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content 
                className="z-50 w-64 p-3.5 bg-card/95 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl outline-none"
                sideOffset={5}
                align="center"
              >
                <div className="grid grid-cols-4 gap-2">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setContent(c => c + emoji)}
                      className="h-10 w-10 flex items-center justify-center text-xl hover:bg-accent/80 rounded-xl transition-all active:scale-95 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <Popover.Arrow className="fill-border" />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>

        <Button
          onClick={handleSubmit}
          size="sm"
          variant="gradient"
          disabled={!content.trim() && files.length === 0}
          isLoading={isPending}
          className="px-5 font-bold rounded-2xl"
        >
          <Send className="h-3.5 w-3.5" />
          Post
        </Button>
      </div>
    </div>
  );
}

