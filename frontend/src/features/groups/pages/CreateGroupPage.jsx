import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Globe, ArrowLeft, Camera, Image, Shield, Users, Compass, Eye, EyeOff, Plus } from 'lucide-react';
import api from '@/shared/api/axios.instance.js';
import Button from '@/shared/components/Button.jsx';
import Input from '@/shared/components/Input.jsx';
import { toast } from '@/shared/hooks/useToast.js';

const CATEGORIES = ['General', 'Gaming', 'Technology', 'Entertainment', 'Art & Design', 'Music', 'Sports', 'Science & Edu', 'Business', 'Lifestyle'];

export default function CreateGroupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [privacy, setPrivacy] = useState('public');
  const [visibility, setVisibility] = useState('visible');
  const [tags, setTags] = useState('');

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const createMutation = useMutation({
    mutationFn: (formData) =>
      api.post('/groups', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    onSuccess: (res) => {
      const group = res.data.data.group;
      toast.success('Group created successfully! 🎉');
      queryClient.invalidateQueries({ queryKey: ['groups-dashboard'] });
      navigate(`/groups/${group._id}`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to create group');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      return toast.error('Group name is required');
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('privacy', privacy);
    formData.append('visibility', visibility);
    formData.append('tags', tags);

    if (avatarFile) formData.append('avatar', avatarFile);
    if (coverFile) formData.append('cover', coverFile);

    createMutation.mutate(formData);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 pb-24 space-y-6">
      {/* Back button */}
      <Link to="/groups" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="h-4 w-4" /> Back to Groups
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form panel */}
        <div className="lg:col-span-3 rounded-3xl border border-border/50 bg-card/45 backdrop-blur-md p-6 shadow-nova space-y-6">
          <div>
            <h1 className="text-xl font-black text-foreground">Create a New Community</h1>
            <p className="text-xs text-muted-foreground mt-1">Set up your community, add details, and start gathering members.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Group Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="groupName">Group Name</label>
              <Input
                id="groupName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nova Tech Developers"
                className="rounded-xl w-full"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="description">Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what your group is about..."
                rows={4}
                className="w-full rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground text-sm p-3 focus:outline-none focus:ring-1 focus:ring-ring resize-none leading-relaxed"
              />
            </div>

            {/* Grid of category / privacy / visibility */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="category">Category</label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card text-foreground text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Privacy */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="privacy">Privacy</label>
                <select
                  id="privacy"
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card text-foreground text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  <option value="public">Public (Anyone can view & join)</option>
                  <option value="private">Private (Only members can view)</option>
                </select>
              </div>
            </div>

            {/* Visibility & Tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Visibility */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="visibility">Group Visibility</label>
                <select
                  id="visibility"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  disabled={privacy === 'public'}
                  className="w-full rounded-xl border border-border bg-card text-foreground text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="visible">Visible (Anyone can search group)</option>
                  <option value="hidden">Hidden (Only members can find it)</option>
                </select>
                {privacy === 'public' && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">Public groups must always be Visible.</p>
                )}
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="tags">Tags (comma-separated)</label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. dev, coding, tech"
                  className="rounded-xl w-full"
                />
              </div>
            </div>

            {/* Media Uploads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
              {/* Avatar upload */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Group Avatar</p>
                <label className="flex items-center gap-3 p-3 border border-border border-dashed hover:border-primary/50 bg-card/25 rounded-xl cursor-pointer transition-colors">
                  <div className="h-10 w-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
                    <Camera className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-foreground">Upload Avatar</p>
                    <p className="text-[10px] text-muted-foreground">PNG, JPG, WEBP (Square)</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
              </div>

              {/* Cover upload */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Group Cover Image</p>
                <label className="flex items-center gap-3 p-3 border border-border border-dashed hover:border-primary/50 bg-card/25 rounded-xl cursor-pointer transition-colors">
                  <div className="h-10 w-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
                    <Image className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-foreground">Upload Cover Image</p>
                    <p className="text-[10px] text-muted-foreground">Optimal size: 820x312 pixels</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                </label>
              </div>
            </div>

            <Button
              type="submit"
              variant="gradient"
              size="md"
              className="w-full mt-6 shadow-nova-sm flex items-center justify-center gap-2"
              isLoading={createMutation.isPending}
            >
              <Plus className="h-4 w-4" /> Create Community
            </Button>
          </form>
        </div>

        {/* Live Preview Panel */}
        <div className="lg:col-span-2 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Live Card Preview</p>
          <div className="rounded-3xl border border-border/50 bg-card/45 backdrop-blur-md overflow-hidden shadow-nova-lg flex flex-col h-fit">
            {/* Preview Cover */}
            <div className="h-32 bg-muted relative">
              {coverPreview ? (
                <img src={coverPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-primary/20 via-accent/15 to-transparent flex items-center justify-center text-muted-foreground/30 font-bold uppercase tracking-widest text-xs">
                  Cover Preview Area
                </div>
              )}
              <span className="absolute top-3 right-3 text-[9px] bg-black/60 backdrop-blur-sm text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {privacy}
              </span>
            </div>

            {/* Preview Body */}
            <div className="p-5 relative pt-8 flex-1 flex flex-col">
              {/* Floating avatar */}
              <div className="absolute -top-8 left-5 ring-4 ring-card bg-muted rounded-2xl overflow-hidden h-14 w-14 flex items-center justify-center text-muted-foreground shadow-md">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Globe className="h-6 w-6 text-muted-foreground/50" />
                )}
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-base text-foreground truncate">
                  {name || 'New Community Name'}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> 1 member</span>
                  <span>·</span>
                  <span className="font-semibold text-primary">{category}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-3 line-clamp-3 leading-relaxed flex-1 italic bg-muted/20 p-2.5 rounded-xl border border-border/20">
                {description || 'This is a live preview of your community description. Describe topics, rules, or goals to invite others!'}
              </p>

              {/* Tags preview */}
              {tags && (
                <div className="flex flex-wrap gap-1 mt-4">
                  {tags.split(',').map((t, i) => t.trim() && (
                    <span key={i} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-md font-semibold">
                      #{t.trim().toLowerCase()}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-5 pt-3 border-t border-border/40 flex gap-2">
                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary" /> Admin: You (Owner)
                </div>
                {privacy === 'private' && (
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 ml-auto">
                    {visibility === 'visible' ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {visibility === 'visible' ? 'Searchable' : 'Hidden'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
