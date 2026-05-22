import { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe, Users, Shield, Settings, Info, MessageSquare, Image,
  Plus, Edit, Trash, Check, X, ShieldAlert, Pin, UserCheck, AlertTriangle, ArrowLeft, Lock,
  Volume2, VolumeX, Ban
} from 'lucide-react';
import api from '@/shared/api/axios.instance.js';
import Avatar from '@/shared/components/Avatar.jsx';
import Button from '@/shared/components/Button.jsx';
import Input from '@/shared/components/Input.jsx';
import { Skeleton } from '@/shared/components/Skeleton.jsx';
import { toast } from '@/shared/hooks/useToast.js';
import GroupPostCard from '../components/GroupPostCard.jsx';
import GroupEditorModal from '../components/GroupEditorModal.jsx';
import { cn } from '@/shared/utils/cn.js';

export default function GroupDetailPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('discussion'); // 'discussion', 'about', 'members', 'media', 'manage'
  const [showPostEditor, setShowPostEditor] = useState(false);
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleDetail, setNewRuleDetail] = useState('');

  // Group Settings State for editing
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPrivacy, setEditPrivacy] = useState('');
  const [editVisibility, setEditVisibility] = useState('');
  const [editPostMod, setEditPostMod] = useState(false);
  const [editApprovalRequired, setEditApprovalRequired] = useState(false);

  // Fetch Group details
  const { data: groupData, isLoading } = useQuery({
    queryKey: ['group-detail', groupId],
    queryFn: () => api.get(`/groups/${groupId}`).then((res) => res.data.data.group),
  });

  const isMember = !!groupData?.myMembership;
  const myRole = groupData?.myMembership?.role;
  const isModOrAbove = isMember && ['owner', 'admin', 'moderator'].includes(myRole);
  const isAdminOrAbove = isMember && ['owner', 'admin'].includes(myRole);

  // Fetch Group posts
  const { data: postsData, isLoading: isPostsLoading } = useQuery({
    queryKey: ['group-posts', groupId],
    queryFn: () => api.get(`/groups/${groupId}/posts`).then((res) => res.data.data),
    enabled: !!groupData && (groupData.privacy === 'public' || isMember),
  });

  // Fetch Group members
  const { data: membersData } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: () => api.get(`/groups/${groupId}/members`).then((res) => res.data.data),
    enabled: (activeTab === 'members' || activeTab === 'manage') && !!groupData && (groupData.privacy === 'public' || isMember),
  });

  // Fetch Join requests (Admin/Mod only)
  const { data: requestsData } = useQuery({
    queryKey: ['group-requests', groupId],
    queryFn: () => api.get(`/groups/${groupId}/requests`).then((res) => res.data.data.requests),
    enabled: activeTab === 'manage' && !!groupData && isModOrAbove,
  });

  // Fetch Pending posts (Admin/Mod only)
  const { data: pendingPostsData } = useQuery({
    queryKey: ['group-pending-posts', groupId],
    queryFn: () => api.get(`/groups/${groupId}/posts/pending`).then((res) => res.data.data.posts),
    enabled: activeTab === 'manage' && !!groupData && isModOrAbove,
  });

  // Fetch Reports (Admin/Mod only)
  const { data: reportsData } = useQuery({
    queryKey: ['group-reports', groupId],
    queryFn: () => api.get(`/groups/${groupId}/reports`).then((res) => res.data.data.reports),
    enabled: activeTab === 'manage' && !!groupData && isModOrAbove,
  });

  // Fetch Banned members (Admin/Mod only)
  const { data: blockedMembersData } = useQuery({
    queryKey: ['group-blocked-members', groupId],
    queryFn: () => api.get(`/groups/${groupId}/members?blocked=true`).then((res) => res.data.data),
    enabled: activeTab === 'manage' && !!groupData && isModOrAbove,
  });

  // Join group mutation
  const joinMutation = useMutation({
    mutationFn: () => api.post(`/groups/${groupId}/join`),
    onSuccess: (res) => {
      const data = res.data.data;
      if (data.status === 'joined') {
        toast.success('Joined group! 🎉');
      } else {
        toast.info('Join request submitted.');
      }
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to join group');
    },
  });

  // Leave group mutation
  const leaveMutation = useMutation({
    mutationFn: () => api.post(`/groups/${groupId}/leave`),
    onSuccess: () => {
      toast.success('Left group');
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups-dashboard'] });
      navigate('/groups');
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: () => api.delete(`/groups/${groupId}`),
    onSuccess: () => {
      toast.success('Group deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['groups-dashboard'] });
      navigate('/groups');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete group');
    },
  });

  // Update group details mutation
  const updateMutation = useMutation({
    mutationFn: (payload) => api.put(`/groups/${groupId}`, payload),
    onSuccess: () => {
      toast.success('Group settings updated');
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
    },
  });

  // Post approval mutation
  const approvePostMutation = useMutation({
    mutationFn: (postId) => api.patch(`/groups/${groupId}/posts/${postId}/approve`),
    onSuccess: () => {
      toast.success('Post approved');
      queryClient.invalidateQueries({ queryKey: ['group-pending-posts', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
    },
  });

  // Post delete mutation
  const deletePostMutation = useMutation({
    mutationFn: (postId) => api.delete(`/groups/${groupId}/posts/${postId}`),
    onSuccess: () => {
      toast.success('Post deleted');
      queryClient.invalidateQueries({ queryKey: ['group-pending-posts', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
    },
  });

  // Join request response mutation
  const respondRequestMutation = useMutation({
    mutationFn: ({ requestId, action }) =>
      api.post(`/groups/${groupId}/requests/${requestId}/respond`, { action }),
    onSuccess: (_, variables) => {
      toast.success(`Request ${variables.action}ed`);
      queryClient.invalidateQueries({ queryKey: ['group-requests', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
    },
  });

  // Member kick mutation
  const kickMemberMutation = useMutation({
    mutationFn: (userId) => api.delete(`/groups/${groupId}/members/${userId}`),
    onSuccess: () => {
      toast.success('Member kicked');
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
    },
  });

  // Role update mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => api.patch(`/groups/${groupId}/members/${userId}/role`, { role }),
    onSuccess: () => {
      toast.success('Member role updated');
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
    },
  });

  // Status update mutation (Mute / Block)
  const updateStatusMutation = useMutation({
    mutationFn: ({ userId, isMuted, isBlocked }) =>
      api.patch(`/groups/${groupId}/members/${userId}/status`, { isMuted, isBlocked }),
    onSuccess: (_, variables) => {
      if (variables.isBlocked === true) {
        toast.success('Member blocked and removed from group');
      } else if (variables.isBlocked === false) {
        toast.success('Member unblocked');
      } else if (variables.isMuted !== undefined) {
        toast.success(variables.isMuted ? 'Member muted' : 'Member unmuted');
      }
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-blocked-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update member status');
    },
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: (payload) => api.post(`/groups/${groupId}/rules`, payload),
    onSuccess: () => {
      toast.success('Rule created');
      setNewRuleTitle('');
      setNewRuleDetail('');
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to create rule');
    },
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId) => api.delete(`/groups/${groupId}/rules/${ruleId}`),
    onSuccess: () => {
      toast.success('Rule deleted');
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete rule');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6 pb-24">
        <Skeleton className="h-64 rounded-3xl w-full" />
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!groupData) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3" />
        <h2 className="text-lg font-bold text-foreground">Group Not Found</h2>
        <p className="text-sm text-muted-foreground mt-1">This group may have been deleted or you do not have access.</p>
        <Link to="/groups" className="mt-4 inline-block">
          <Button variant="outline">Back to Groups</Button>
        </Link>
      </div>
    );
  }

  const startEdit = () => {
    setEditName(groupData.name);
    setEditDesc(groupData.description);
    setEditCategory(groupData.category);
    setEditPrivacy(groupData.privacy);
    setEditVisibility(groupData.visibility);
    setEditPostMod(groupData.settings?.postModeration || false);
    setEditApprovalRequired(groupData.settings?.membershipApprovalRequired || false);
    setEditMode(true);
  };

  const saveSettings = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      name: editName,
      description: editDesc,
      category: editCategory,
      privacy: editPrivacy,
      visibility: editVisibility,
      postModeration: editPostMod,
      membershipApprovalRequired: editApprovalRequired,
    });
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 pb-24 space-y-6">
      {/* Back button */}
      <Link to="/groups" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="h-4 w-4" /> Back to Groups Hub
      </Link>

      {/* Header Container */}
      <div className="rounded-3xl border border-border/50 bg-card overflow-hidden shadow-nova">
        {/* Cover */}
        <div className="h-44 md:h-56 bg-muted relative">
          {groupData.cover ? (
            <img src={groupData.cover} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/10 via-accent/5 to-transparent" />
          )}
        </div>

        {/* Info Area */}
        <div className="p-6 relative pt-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
          {/* Avatar floating */}
          <div className="absolute -top-12 left-6 ring-4 ring-card rounded-3xl overflow-hidden shadow-md">
            <Avatar src={groupData.avatar} name={groupData.name} size="lg" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl md:text-2xl font-black text-foreground">{groupData.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5"><Globe className="h-4 w-4 text-primary" /> {groupData.privacy}</span>
              <span>·</span>
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {groupData.memberCount} members</span>
              <span>·</span>
              <span className="text-primary font-semibold">{groupData.category}</span>
            </div>
          </div>

          {/* Join/Leave Button */}
          <div className="shrink-0 flex gap-2">
            {isMember ? (
              <>
                <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1">
                  <UserCheck className="h-4 w-4" /> {myRole?.toUpperCase()}
                </span>
                {myRole === 'owner' ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
                        deleteGroupMutation.mutate();
                      }
                    }}
                    isLoading={deleteGroupMutation.isPending}
                  >
                    Delete Group
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => leaveMutation.mutate()} isLoading={leaveMutation.isPending}>
                    Leave Group
                  </Button>
                )}
              </>
            ) : groupData.pendingRequest ? (
              <Button variant="outline" size="sm" disabled>
                Request Pending
              </Button>
            ) : (
              <Button variant="gradient" size="sm" onClick={() => joinMutation.mutate()} isLoading={joinMutation.isPending}>
                Join Group
              </Button>
            )}
          </div>
        </div>

        {/* Tab Headers */}
        <div className="border-t border-border/40 px-6 flex gap-4 overflow-x-auto scrollbar-none">
          {[
            { id: 'discussion', label: 'Discussion', icon: MessageSquare },
            { id: 'about', label: 'About', icon: Info },
            { id: 'members', label: 'Members', icon: Users },
            { id: 'manage', label: 'Manage Tools', icon: Settings, hide: !isModOrAbove },
          ].map(({ id, label, icon: Icon, hide }) => {
            if (hide) return null;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`py-4 px-1 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
                  activeTab === id
                    ? 'border-primary text-primary font-black'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main detail page grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Tab Panel Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. DISCUSSION PANEL */}
          {activeTab === 'discussion' && (
            !isMember && groupData.privacy === 'private' ? (
              <div className="text-center py-16 border border-border bg-card/45 rounded-3xl p-6 shadow-sm">
                <Lock className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
                <h3 className="text-base font-bold text-foreground">This Community is Private</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  Only members can view posts and members in this community. Click "Join Group" to request membership.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
              {/* Post trigger */}
              {isMember && (
                <div
                  onClick={() => setShowPostEditor(true)}
                  className="rounded-2xl border border-border/50 bg-card/45 p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/10 transition-colors"
                >
                  <Avatar src={groupData.creator?.avatar} name="Me" size="sm" />
                  <div className="flex-1 bg-muted/30 border border-border/40 rounded-xl px-4 py-2 text-xs text-muted-foreground font-semibold">
                    Write something to this community...
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0 flex items-center gap-1.5">
                    <Plus className="h-4 w-4 text-primary" /> Post
                  </Button>
                </div>
              )}

              {/* Pinned Posts */}
              {postsData?.pinnedPosts?.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1.5 px-1">
                    <Pin className="h-4 w-4 rotate-45" /> Pinned Announcements
                  </h3>
                  {postsData.pinnedPosts.map((post) => (
                    <GroupPostCard key={post._id} post={post} groupId={groupId} myRole={myRole} />
                  ))}
                </div>
              )}

              {/* Regular Posts List */}
              <div className="space-y-5">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
                  Recent Discussions
                </h3>
                {isPostsLoading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="border border-border/50 bg-card rounded-2xl p-5 space-y-3">
                      <div className="flex gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-3 w-1/4" />
                        </div>
                      </div>
                      <Skeleton className="h-12 rounded-xl w-full" />
                    </div>
                  ))
                ) : postsData?.posts?.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-border/60 rounded-2xl bg-card/25">
                    <MessageSquare className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-muted-foreground">No posts yet. Start the conversation!</p>
                  </div>
                ) : (
                  postsData.posts.map((post) => (
                    <GroupPostCard key={post._id} post={post} groupId={groupId} myRole={myRole} />
                  ))
                )}
              </div>
            </div>
            )
          )}

          {/* 2. ABOUT PANEL */}
          {activeTab === 'about' &&
            <div className="rounded-3xl border border-border/50 bg-card p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">About Community</h3>
                <p className="text-sm text-foreground leading-relaxed mt-3 whitespace-pre-wrap">
                  {groupData.description || 'No description provided.'}
                </p>
              </div>

              {groupData.tags?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Topics</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {groupData.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-muted border border-border/40 px-2.5 py-1 rounded-lg text-foreground font-semibold">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-border/40 pt-5 space-y-3 text-xs text-muted-foreground font-medium">
                <p className="flex justify-between"><span>Category</span> <span className="text-foreground font-bold">{groupData.category}</span></p>
                <p className="flex justify-between"><span>Privacy</span> <span className="text-foreground font-bold capitalize">{groupData.privacy}</span></p>
                <p className="flex justify-between"><span>Created by</span> <span className="text-primary font-bold">@{groupData.creator?.username}</span></p>
                <p className="flex justify-between"><span>Created at</span> <span className="text-foreground font-bold">{new Date(groupData.createdAt).toLocaleDateString()}</span></p>
              </div>
            </div>
          }

          {/* 3. MEMBERS PANEL */}
          {activeTab === 'members' && (
            !isMember && groupData.privacy === 'private' ? (
              <div className="text-center py-16 border border-border bg-card/45 rounded-3xl p-6 shadow-sm">
                <Lock className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
                <h3 className="text-base font-bold text-foreground">This Community is Private</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  Join the group to view the list of members.
                </p>
              </div>
            ) : (
              <div className="rounded-3xl border border-border/50 bg-card p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">Member Directory</h3>
                <div className="divide-y divide-border/40">
                  {membersData?.map((member) => (
                    <div key={member._id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <Avatar src={member.user?.avatar} name={member.user?.name} size="sm" />
                        <div>
                          <p className="font-bold text-sm text-foreground">{member.user?.name}</p>
                          <p className="text-xs text-muted-foreground">@{member.user?.username}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          member.role === 'owner' ? 'bg-red-500/10 text-red-500' :
                          member.role === 'admin' ? 'bg-blue-500/10 text-blue-500' :
                          member.role === 'moderator' ? 'bg-emerald-500/10 text-emerald-500' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {member.role}
                        </span>

                        {/* Admin/Mod Action Menu */}
                        {isModOrAbove && member.role !== 'owner' && member.user?._id !== groupData.creator?._id && (
                          <div className="flex items-center gap-1.5">
                            {/* Promote/Demote Roles */}
                            {myRole === 'owner' ? (
                              <div className="flex gap-1 flex-wrap">
                                {member.role === 'member' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="xs"
                                      onClick={() => updateRoleMutation.mutate({ userId: member.user._id, role: 'moderator' })}
                                    >
                                      Promote Mod
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="xs"
                                      onClick={() => updateRoleMutation.mutate({ userId: member.user._id, role: 'admin' })}
                                    >
                                      Promote Admin
                                    </Button>
                                  </>
                                )}
                                {member.role === 'moderator' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="xs"
                                      onClick={() => updateRoleMutation.mutate({ userId: member.user._id, role: 'member' })}
                                    >
                                      Demote Member
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="xs"
                                      onClick={() => updateRoleMutation.mutate({ userId: member.user._id, role: 'admin' })}
                                    >
                                      Promote Admin
                                    </Button>
                                  </>
                                )}
                                {member.role === 'admin' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="xs"
                                      onClick={() => updateRoleMutation.mutate({ userId: member.user._id, role: 'moderator' })}
                                    >
                                      Demote Mod
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="xs"
                                      onClick={() => updateRoleMutation.mutate({ userId: member.user._id, role: 'member' })}
                                    >
                                      Demote Member
                                    </Button>
                                  </>
                                )}
                              </div>
                            ) : myRole === 'admin' ? (
                              <div className="flex gap-1 flex-wrap">
                                {member.role === 'member' && (
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() => updateRoleMutation.mutate({ userId: member.user._id, role: 'moderator' })}
                                  >
                                    Promote Mod
                                  </Button>
                                )}
                                {member.role === 'moderator' && (
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() => updateRoleMutation.mutate({ userId: member.user._id, role: 'member' })}
                                  >
                                    Demote
                                  </Button>
                                )}
                              </div>
                            ) : null}

                            {/* Mute/Unmute toggle (Owner/Admin/Mod) */}
                            <button
                              onClick={() => updateStatusMutation.mutate({ userId: member.user._id, isMuted: !member.isMuted })}
                              className={cn(
                                "p-1 rounded transition-colors",
                                member.isMuted 
                                  ? "text-amber-500 hover:bg-amber-500/15" 
                                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
                              )}
                              title={member.isMuted ? "Unmute member" : "Mute member"}
                            >
                              {member.isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                            </button>

                            {/* Kick (Owner/Admin/Mod) */}
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to kick ${member.user.name} from the group?`)) {
                                  kickMemberMutation.mutate(member.user._id);
                                }
                              }}
                              className="p-1 rounded text-destructive hover:bg-destructive/15 transition-colors"
                              title="Kick member"
                            >
                              <X className="h-4 w-4" />
                            </button>

                            {/* Block / Ban (Owner/Admin only) */}
                            {isAdminOrAbove && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to ban ${member.user.name} from the group?`)) {
                                    updateStatusMutation.mutate({ userId: member.user._id, isBlocked: true });
                                  }
                                }}
                                className="p-1 rounded text-destructive hover:bg-destructive/15 transition-colors"
                                title="Ban member"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
            )
          )}

          {/* 4. MANAGE TOOLS PANEL */}
          {activeTab === 'manage' && isModOrAbove &&
            <div className="space-y-6">
              {/* Settings / Edit Mode */}
              <div className="rounded-3xl border border-border/50 bg-card p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Community Settings</h3>
                  {isAdminOrAbove && !editMode && (
                    <Button variant="outline" size="xs" className="flex items-center gap-1" onClick={startEdit}>
                      <Edit className="h-3.5 w-3.5" /> Edit Details
                    </Button>
                  )}
                </div>

                {editMode ? (
                  <form onSubmit={saveSettings} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">Community Name</label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">Description</label>
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-border bg-card text-foreground text-sm p-3 focus:ring-1 focus:ring-ring resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground">Privacy</label>
                        <select
                          value={editPrivacy}
                          onChange={(e) => setEditPrivacy(e.target.value)}
                          className="w-full rounded-xl border border-border bg-card text-foreground text-sm p-2"
                        >
                          <option value="public">Public</option>
                          <option value="private">Private</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground">Visibility</label>
                        <select
                          value={editVisibility}
                          onChange={(e) => setEditVisibility(e.target.value)}
                          className="w-full rounded-xl border border-border bg-card text-foreground text-sm p-2"
                        >
                          <option value="visible">Visible</option>
                          <option value="hidden">Hidden</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-border/40">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editPostMod}
                          onChange={(e) => setEditPostMod(e.target.checked)}
                          className="rounded border-border text-primary focus:ring-ring"
                        />
                        <span className="text-xs font-semibold text-foreground">Post Moderation (Approve posts before displaying)</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editApprovalRequired}
                          onChange={(e) => setEditApprovalRequired(e.target.checked)}
                          className="rounded border-border text-primary focus:ring-ring"
                        />
                        <span className="text-xs font-semibold text-foreground">Require Membership Approval</span>
                      </label>
                    </div>

                    <div className="flex gap-2 justify-end pt-3">
                      <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>Cancel</Button>
                      <Button variant="gradient" size="sm" type="submit">Save Changes</Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-2 text-xs text-muted-foreground font-medium">
                    <p className="flex justify-between"><span>Post Moderation:</span> <span className="text-foreground font-bold">{groupData.settings?.postModeration ? 'Enabled' : 'Disabled'}</span></p>
                    <p className="flex justify-between"><span>Membership Approval Required:</span> <span className="text-foreground font-bold">{groupData.settings?.membershipApprovalRequired ? 'Enabled' : 'Disabled'}</span></p>
                  </div>
                )}
              </div>

              {/* Pending Join Requests (Owner/Admin/Mod) */}
              <div className="rounded-3xl border border-border/50 bg-card p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Join Requests ({requestsData?.length || 0})</h3>
                {requestsData?.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No pending requests.</p>
                ) : (
                  <div className="divide-y divide-border/40">
                    {requestsData?.map((req) => (
                      <div key={req._id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <Avatar src={req.user?.avatar} name={req.user?.name} size="sm" />
                          <div>
                            <p className="font-bold text-sm text-foreground">{req.user?.name}</p>
                            <p className="text-xs text-muted-foreground">@{req.user?.username}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="gradient" size="xs" onClick={() => respondRequestMutation.mutate({ requestId: req._id, action: 'approve' })}>
                            Approve
                          </Button>
                          <Button variant="outline" size="xs" onClick={() => respondRequestMutation.mutate({ requestId: req._id, action: 'reject' })}>
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Posts queue */}
              <div className="rounded-3xl border border-border/50 bg-card p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Posts Queue ({pendingPostsData?.length || 0})</h3>
                {pendingPostsData?.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No posts waiting for review.</p>
                ) : (
                  <div className="space-y-4">
                    {pendingPostsData?.map((post) => (
                      <div key={post._id} className="border border-border/40 rounded-xl p-3 bg-muted/20 space-y-2">
                        <div className="flex items-center gap-2">
                          <Avatar src={post.author?.avatar} name={post.author?.name} size="xs" />
                          <span className="text-xs font-bold text-foreground">{post.author?.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{post.content}</p>
                        <div className="flex gap-2 justify-end pt-1">
                          <Button variant="outline" size="xs" onClick={() => deletePostMutation.mutate(post._id)}>Reject</Button>
                          <Button variant="gradient" size="xs" onClick={() => approvePostMutation.mutate(post._id)}>Approve</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Banned Members (Owner/Admin only) */}
              {isAdminOrAbove && (
                <div className="rounded-3xl border border-border/50 bg-card p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Banned Members ({blockedMembersData?.length || 0})</h3>
                  {blockedMembersData?.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No banned members.</p>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {blockedMembersData?.map((member) => (
                        <div key={member._id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-3">
                            <Avatar src={member.user?.avatar} name={member.user?.name} size="sm" />
                            <div>
                              <p className="font-bold text-sm text-foreground">{member.user?.name}</p>
                              <p className="text-xs text-muted-foreground">@{member.user?.username}</p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to unban ${member.user.name}?`)) {
                                updateStatusMutation.mutate({ userId: member.user._id, isBlocked: false });
                              }
                            }}
                          >
                            Unban
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Community Rules Management (Owner/Admin only) */}
              {isAdminOrAbove && (
                <div className="rounded-3xl border border-border/50 bg-card p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Group Rules ({groupData.rules?.length || 0})</h3>
                  
                  {groupData.rules?.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No rules created yet.</p>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {groupData.rules?.map((rule, idx) => (
                        <div key={rule._id} className="py-3 flex items-start justify-between gap-4 first:pt-0 last:pb-0">
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-foreground">{idx + 1}. {rule.title}</p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{rule.detail}</p>
                          </div>
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete this rule?`)) {
                                deleteRuleMutation.mutate(rule._id);
                              }
                            }}
                            className="p-1 rounded text-destructive hover:bg-destructive/15 transition-colors shrink-0"
                            title="Delete Rule"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add New Rule Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newRuleTitle.trim()) return;
                      createRuleMutation.mutate({ title: newRuleTitle, detail: newRuleDetail });
                    }}
                    className="pt-4 border-t border-border/40 space-y-3"
                  >
                    <h4 className="text-xs font-bold text-foreground">Create New Rule</h4>
                    <div className="space-y-2">
                      <Input
                        placeholder="Rule Title (e.g., Be respectful)"
                        value={newRuleTitle}
                        onChange={(e) => setNewRuleTitle(e.target.value)}
                        className="text-xs p-2.5"
                        required
                      />
                      <textarea
                        placeholder="Rule Details/Description (optional)"
                        value={newRuleDetail}
                        onChange={(e) => setNewRuleDetail(e.target.value)}
                        rows={2}
                        className="w-full rounded-xl border border-border bg-card text-foreground text-xs p-2.5 focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <Button 
                      variant="gradient" 
                      size="xs" 
                      type="submit" 
                      isLoading={createRuleMutation.isPending}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Add Rule
                    </Button>
                  </form>
                </div>
              )}
            </div>
          }
        </div>

        {/* Sidebar Info Area */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-border/50 bg-card/45 backdrop-blur-md p-6 shadow-nova space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Rules & Guidelines</h3>
            {groupData.rules?.length === 0 ? (
              <p className="text-xs text-muted-foreground leading-relaxed">No rules published. Be polite, friendly, and respectful!</p>
            ) : (
              <div className="space-y-3">
                {groupData.rules?.map((rule, idx) => (
                  <div key={rule._id} className="space-y-0.5">
                    <p className="text-xs font-extrabold text-foreground">{idx + 1}. {rule.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{rule.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Modal Popup */}
      {showPostEditor && (
        <GroupEditorModal
          groupId={groupId}
          onClose={() => setShowPostEditor(false)}
          onSuccess={() => {
            setShowPostEditor(false);
            queryClient.invalidateQueries({ queryKey: ['group-posts', groupId] });
            queryClient.invalidateQueries({ queryKey: ['group-pending-posts', groupId] });
          }}
        />
      )}
    </div>
  );
}
