import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useRef, useState, useEffect } from 'react';
import { Camera, Briefcase, GraduationCap, Heart, MapPin, Globe, Sparkles, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import Avatar from '@/shared/components/Avatar.jsx';
import Button from '@/shared/components/Button.jsx';
import Input from '@/shared/components/Input.jsx';
import api from '@/shared/api/axios.instance.js';
import { toast } from '@/shared/hooks/useToast.js';
import { cn } from '@/shared/utils/cn.js';

const editSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50).optional(),
  bio: z.string().max(200, 'Bio cannot exceed 200 characters').optional(),
  website: z.string().url('Please enter a valid URL').or(z.literal('')).optional(),
  location: z.string().max(100).optional(),
  work: z.string().max(100).optional(),
  education: z.string().max(100).optional(),
  relationshipStatus: z.string().optional(),
  hobbies: z.string().optional(),
});

const RELATIONSHIP_STATUSES = [
  '', 'Single', 'In a relationship', 'Married', 'It\'s complicated'
];

export default function EditProfilePage() {
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [coverPreview, setCoverPreview] = useState(user?.cover || '');

  // Setup form
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: user?.name || '',
      bio: user?.bio || '',
      website: user?.website || '',
      location: user?.location || '',
      work: user?.work || '',
      education: user?.education || '',
      relationshipStatus: user?.relationshipStatus || '',
      hobbies: user?.hobbies ? user.hobbies.join(', ') : '',
    },
  });

  const hasImageChanges = !!avatarFile || !!coverFile;
  const isFormDirty = isDirty || hasImageChanges;

  const updateMutation = useMutation({
    mutationFn: (data) => {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          formData.append(key, data[key]);
        }
      });
      if (avatarFile) formData.append('avatar', avatarFile);
      if (coverFile) formData.append('cover', coverFile);

      return api.patch('/users/me', formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
    },
    onMutate: () => {
      const toastId = toast.loading('Updating profile...');
      return { toastId };
    },
    onSuccess: (res, variables, context) => {
      updateUser(res.data.data.user);
      queryClient.invalidateQueries({ queryKey: ['profile', user?.username] });
      toast.success('Profile updated successfully! 🎉', { id: context?.toastId });
      navigate(`/${user?.username}`);
    },
    onError: (err, variables, context) => {
      toast.error(err.response?.data?.error?.message || 'Update failed', { id: context?.toastId });
    },
  });

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCoverSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto pb-12 relative px-4 sm:px-6"
    >
      {/* Background blobs */}
      <div className="absolute top-[-5%] left-[-10%] w-[250px] h-[250px] rounded-full bg-primary/10 blur-[70px] pointer-events-none -z-10 dark:bg-primary/5" />
      <div className="absolute top-[40%] right-[-10%] w-[300px] h-[300px] rounded-full bg-secondary/10 blur-[80px] pointer-events-none -z-10 dark:bg-secondary/5" />

      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="h-10 w-10 flex items-center justify-center rounded-full border border-border/80 bg-card/60 backdrop-blur-sm text-foreground hover:bg-accent transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
          title="Go back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-black text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary animate-pulse" /> Edit Profile
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Customize how you present yourself to the world.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-6">
        
        {/* Media Section */}
        <div className="rounded-2xl border border-border/50 bg-card/65 backdrop-blur-xl p-6 shadow-nova-sm">
          <h2 className="text-lg font-bold text-foreground mb-4">Profile Media</h2>
          
          <div className="space-y-6">
            {/* Cover */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">Cover Photo</p>
              <div 
                className="relative h-40 md:h-56 rounded-2xl overflow-hidden bg-nova-gradient cursor-pointer group shadow-nova" 
                onClick={() => coverInputRef.current?.click()}
              >
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103" />
                ) : (
                  <div className="absolute inset-0 bg-black/10 flex items-center justify-center" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                  <div className="flex items-center gap-2 text-white bg-black/50 px-4 py-2 rounded-full font-medium text-xs">
                    <Camera className="h-4 w-4" /> Change Cover
                  </div>
                </div>
                <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
              </div>
            </div>

            {/* Avatar */}
            <div className="flex items-end gap-6 -mt-10 ml-6 z-10">
              <div className="relative cursor-pointer group" onClick={() => avatarInputRef.current?.click()}>
                <div className="p-0.5 rounded-full bg-gradient-to-tr from-primary via-fuchsia-500 to-cyan-400 shadow-nova hover:rotate-3 transition-all duration-500">
                  <div className="rounded-full ring-2 ring-card bg-card overflow-hidden">
                    <Avatar src={avatarPreview} name={user?.name} size="2xl" className="object-cover" />
                  </div>
                </div>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                  <Camera className="h-6 w-6 text-white" />
                </div>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
              </div>
              <div className="pb-2">
                <p className="text-sm font-bold text-foreground">Profile Picture</p>
                <p className="text-xs text-muted-foreground">Click avatar to select image.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="rounded-2xl border border-border/50 bg-card/65 backdrop-blur-xl p-6 shadow-nova-sm">
          <h2 className="text-lg font-bold text-foreground mb-4">Basic Information</h2>
          <div className="grid gap-5">
            <Input label="Full Name" id="edit-name" error={errors.name?.message} {...register('name')} />
            
            <div className="space-y-1.5">
              <label htmlFor="edit-bio" className="block text-sm font-medium text-foreground">Bio</label>
              <textarea
                id="edit-bio"
                rows={3}
                className="w-full rounded-xl border border-input bg-background/50 backdrop-blur-sm px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground"
                placeholder="Write a short bio about yourself..."
                {...register('bio')}
              />
              {errors.bio && <p className="text-xs text-destructive">{errors.bio.message}</p>}
            </div>
          </div>
        </div>

        {/* Detailed Info */}
        <div className="rounded-2xl border border-border/50 bg-card/65 backdrop-blur-xl p-6 shadow-nova-sm">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2 border-b border-border/40 pb-3">
            <Sparkles className="h-5 w-5 text-primary" /> About You
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Briefcase className="h-4 w-4 text-muted-foreground" /> Work
              </label>
              <input
                className="w-full rounded-xl border border-input bg-background/50 backdrop-blur-sm px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                placeholder="Software Engineer at TechCorp"
                {...register('work')}
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <GraduationCap className="h-4 w-4 text-muted-foreground" /> Education
              </label>
              <input
                className="w-full rounded-xl border border-input bg-background/50 backdrop-blur-sm px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                placeholder="Studied at University of Science"
                {...register('education')}
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <MapPin className="h-4 w-4 text-muted-foreground" /> Location
              </label>
              <input
                className="w-full rounded-xl border border-input bg-background/50 backdrop-blur-sm px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                placeholder="Hanoi, Vietnam"
                {...register('location')}
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Heart className="h-4 w-4 text-muted-foreground" /> Relationship
              </label>
              <select
                className="w-full rounded-xl border border-input bg-background/50 backdrop-blur-sm px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                {...register('relationshipStatus')}
              >
                {RELATIONSHIP_STATUSES.map(status => (
                  <option key={status} value={status}>{status || 'Prefer not to say'}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Globe className="h-4 w-4 text-muted-foreground" /> Website
              </label>
              <input
                className="w-full rounded-xl border border-input bg-background/50 backdrop-blur-sm px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                placeholder="https://yourwebsite.com"
                {...register('website')}
              />
              {errors.website && <p className="text-xs text-destructive">{errors.website.message}</p>}
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-muted-foreground" /> Hobbies
              </label>
              <input
                className="w-full rounded-xl border border-input bg-background/50 backdrop-blur-sm px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                placeholder="Reading, Traveling, Gaming (comma separated)"
                {...register('hobbies')}
              />
              <p className="text-xs text-muted-foreground mt-1.5">Separate each hobby with a comma.</p>
            </div>

          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex justify-end gap-3 p-5 bg-card/65 backdrop-blur-xl border border-border/50 rounded-2xl shadow-nova-sm">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate(-1)} 
            className="border-border hover:bg-accent font-semibold transition-all px-6"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant={isFormDirty ? "gradient" : "outline"} 
            isLoading={updateMutation.isPending} 
            disabled={!isFormDirty}
            className={cn(
              "px-8 font-semibold transition-all duration-300",
              isFormDirty ? "text-white shadow-nova-sm hover:scale-[1.02] active:scale-[0.98]" : "opacity-40"
            )}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
