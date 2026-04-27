import {
  Group,
  GroupMember,
  GroupPost,
  GroupPostMedia,
  GroupRule,
  GroupInvitation,
  GroupJoinRequest,
  GroupNotification,
  GroupReport,
  GroupSettings,
} from './groups.model.js';
import User from '../users/users.model.js';
import Reaction from '../posts/reaction.model.js';
import Comment from '../comments/comments.model.js';
import { NotFoundError, ForbiddenError, AppError } from '../../shared/errors/index.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../../shared/utils/cloudinary.utils.js';
import { cursorPaginate, paginate } from '../../shared/utils/pagination.utils.js';

// Helper to check if a user is an admin/owner/moderator
async function getMemberRole(groupId, userId) {
  const member = await GroupMember.findOne({ group: groupId, user: userId });
  return member ? member.role : null;
}

// Helper to send group notification
async function createGroupNotification({ recipient, actor, type, group, referenceId, message }) {
  try {
    await GroupNotification.create({
      recipient,
      actor,
      type,
      group,
      referenceId,
      message,
    });
  } catch (err) {
    console.error('Failed to create group notification:', err.message);
  }
}

// ── GROUPS CRUD ──────────────────────────────────────────────────────────────

export async function createGroup(creatorId, data, files = {}) {
  const { name, description, category, privacy, visibility, tags } = data;

  let avatarUrl = '';
  let coverUrl = '';

  if (files.avatar?.[0]) {
    const res = await uploadToCloudinary(files.avatar[0].buffer, { folder: 'nova/groups/avatars' });
    avatarUrl = res.secure_url;
  }
  if (files.cover?.[0]) {
    const res = await uploadToCloudinary(files.cover[0].buffer, { folder: 'nova/groups/covers' });
    coverUrl = res.secure_url;
  }

  const parsedTags = Array.isArray(tags) ? tags : tags ? tags.split(',').map((t) => t.trim()) : [];

  const group = await Group.create({
    name,
    description: description || '',
    category: category || 'General',
    privacy: privacy || 'public',
    visibility: visibility || 'visible',
    tags: parsedTags,
    avatar: avatarUrl,
    cover: coverUrl,
    creator: creatorId,
  });

  // Create default settings
  await GroupSettings.create({
    group: group._id,
    postModeration: false,
    membershipApprovalRequired: false,
    joinQuestions: [],
  });

  // Add creator as Owner member
  await GroupMember.create({
    group: group._id,
    user: creatorId,
    role: 'owner',
  });

  return group;
}

export async function getGroupsDashboard(userId) {
  // Load current user profile details (hobbies, friends list)
  const currentUser = await User.findById(userId).select('hobbies friends').lean();
  const userHobbies = currentUser?.hobbies || [];
  const userFriends = currentUser?.friends || [];

  // 1. User's joined groups
  const joinedMemberships = await GroupMember.find({ user: userId })
    .populate('group')
    .lean();

  const joinedGroupsRaw = joinedMemberships.map((m) => m.group).filter(Boolean);
  const joinedGroupIds = joinedGroupsRaw.map((g) => g._id.toString());

  // ── Batch fetch member counts for all joined groups ──────────────────────
  const joinedGroupMemberAgg = await GroupMember.aggregate([
    { $match: { group: { $in: joinedGroupsRaw.map((g) => g._id) } } },
    { $group: { _id: '$group', count: { $sum: 1 } } },
  ]);
  const joinedMemberMap = Object.fromEntries(
    joinedGroupMemberAgg.map((d) => [d._id.toString(), d.count])
  );

  const joinedGroups = joinedGroupsRaw.map((group) => ({
    ...group,
    memberCount: joinedMemberMap[group._id.toString()] || 0,
  }));

  // 2. Candidate groups (visible, excluding user's joined groups, not banned)
  const candidateGroups = await Group.find({
    _id: { $nin: joinedGroupIds },
    visibility: 'visible',
    isBanned: { $ne: true },
  }).lean();

  if (candidateGroups.length === 0) {
    return { joinedGroups, featuredGroups: [], suggestions: [] };
  }

  const candidateIds = candidateGroups.map((g) => g._id);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // ── Batch: member counts for all candidates ───────────────────────────────
  const candidateMemberAgg = await GroupMember.aggregate([
    { $match: { group: { $in: candidateIds } } },
    { $group: { _id: '$group', count: { $sum: 1 } } },
  ]);
  const candidateMemberMap = Object.fromEntries(
    candidateMemberAgg.map((d) => [d._id.toString(), d.count])
  );

  // ── Batch: friends-in-group counts ────────────────────────────────────────
  let friendsInGroupMap = {};
  if (userFriends.length > 0) {
    const friendAgg = await GroupMember.aggregate([
      { $match: { group: { $in: candidateIds }, user: { $in: userFriends } } },
      { $group: { _id: '$group', count: { $sum: 1 } } },
    ]);
    friendsInGroupMap = Object.fromEntries(
      friendAgg.map((d) => [d._id.toString(), d.count])
    );
  }

  // ── Batch: recent approved posts per candidate ────────────────────────────
  const recentPostAgg = await GroupPost.aggregate([
    {
      $match: {
        group: { $in: candidateIds },
        createdAt: { $gte: sevenDaysAgo },
        isApproved: true,
      },
    },
    { $group: { _id: '$group', count: { $sum: 1 } } },
  ]);
  const recentPostMap = Object.fromEntries(
    recentPostAgg.map((d) => [d._id.toString(), d.count])
  );

  const joinedCategories = joinedGroups.map((g) => g.category);

  // Compute stats and scores for candidates (no async calls in loop)
  const groupStats = candidateGroups.map((group) => {
      const gid = group._id.toString();
      const memberCount = candidateMemberMap[gid] || 0;
      const friendsJoinedCount = friendsInGroupMap[gid] || 0;
      const recentPostsCount = recentPostMap[gid] || 0;

      // Recommendation algorithm score computation:
      let score = 0;

      // Category match (+15 points)
      if (joinedCategories.includes(group.category)) {
        score += 15;
      }

      // Hobby / Tag match (+10 points per match)
      if (group.tags && group.tags.length > 0 && userHobbies.length > 0) {
        const matches = group.tags.filter((t) =>
          userHobbies.some((h) => h.toLowerCase() === t.toLowerCase())
        );
        score += matches.length * 10;
      }

      // Friends joined (+20 points per friend)
      score += friendsJoinedCount * 20;

      // Recent activity (+5 points per post in the last 7 days, max +50)
      score += Math.min(recentPostsCount * 5, 50);

      // Group size popularity (+1 point per 10 members, max +20)
      score += Math.min(Math.floor(memberCount / 10), 20);

      return { ...group, memberCount, score };
    });

  // Sort by members count for featured/trending
  const featuredGroups = [...groupStats]
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, 6);

  // Sort by recommendation score descending for suggestions
  const suggestions = [...groupStats]
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return {
    joinedGroups,
    featuredGroups,
    suggestions,
  };
}

export async function searchGroups(userId, queryParams) {
  const { q, category, privacy, sort } = queryParams;

  const filter = { visibility: 'visible' };
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { tags: { $regex: q, $options: 'i' } },
    ];
  }
  if (category) {
    filter.category = category;
  }
  if (privacy) {
    filter.privacy = privacy;
  }

  const groups = await Group.find(filter).lean();

  if (groups.length === 0) return [];

  const groupIds = groups.map((g) => g._id);

  // Batch: member counts for all groups
  const memberAgg = await GroupMember.aggregate([
    { $match: { group: { $in: groupIds } } },
    { $group: { _id: '$group', count: { $sum: 1 } } },
  ]);
  const memberCountMap = Object.fromEntries(
    memberAgg.map((d) => [d._id.toString(), d.count])
  );

  // Batch: user's own memberships
  let joinedGroupIdSet = new Set();
  if (userId) {
    const joined = await GroupMember.find(
      { group: { $in: groupIds }, user: userId },
      { group: 1 }
    ).lean();
    joinedGroupIdSet = new Set(joined.map((m) => m.group.toString()));
  }

  const withStats = groups.map((group) => ({
    ...group,
    memberCount: memberCountMap[group._id.toString()] || 0,
    isJoined: joinedGroupIdSet.has(group._id.toString()),
  }));

  if (sort === 'members') {
    withStats.sort((a, b) => b.memberCount - a.memberCount);
  } else {
    // default: newest
    withStats.sort((a, b) => b.createdAt - a.createdAt);
  }

  return withStats;
}

export async function getGroupById(groupId, userId) {
  const group = await Group.findById(groupId).populate('creator', 'name username avatar').lean();
  if (!group) throw new NotFoundError('Group');

  if (group.isBanned) {
    let isAdminUser = false;
    if (userId) {
      const requester = await User.findById(userId).select('role').lean();
      if (requester && ['admin', 'moderator'].includes(requester.role)) {
        isAdminUser = true;
      }
    }
    if (!isAdminUser) {
      throw new ForbiddenError(group.banReason ? `This group has been suspended. Reason: ${group.banReason}` : 'This group has been suspended.');
    }
  }

  const settings = await GroupSettings.findOne({ group: groupId }).lean();
  const rules = await GroupRule.find({ group: groupId }).lean();
  const memberCount = await GroupMember.countDocuments({ group: groupId });

  let myMembership = null;
  let pendingRequest = null;

  if (userId) {
    myMembership = await GroupMember.findOne({ group: groupId, user: userId }).lean();
    if (!myMembership) {
      pendingRequest = await GroupJoinRequest.findOne({ group: groupId, user: userId, status: 'pending' }).lean();
    }
  }

  return {
    ...group,
    settings,
    rules,
    memberCount,
    myMembership,
    pendingRequest,
  };
}

export async function updateGroup(groupId, userId, updates, files = {}) {
  const group = await Group.findById(groupId);
  if (!group) throw new NotFoundError('Group');

  const role = await getMemberRole(groupId, userId);
  if (role !== 'owner' && role !== 'admin') {
    throw new ForbiddenError('Only group owners or admins can update details');
  }

  const { name, description, category, privacy, visibility, tags, postModeration, membershipApprovalRequired, joinQuestions } = updates;

  if (name !== undefined) group.name = name;
  if (description !== undefined) group.description = description;
  if (category !== undefined) group.category = category;
  if (privacy !== undefined) group.privacy = privacy;
  if (visibility !== undefined) group.visibility = visibility;
  if (tags !== undefined) {
    group.tags = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim());
  }

  if (files.avatar?.[0]) {
    const res = await uploadToCloudinary(files.avatar[0].buffer, { folder: 'nova/groups/avatars' });
    group.avatar = res.secure_url;
  }
  if (files.cover?.[0]) {
    const res = await uploadToCloudinary(files.cover[0].buffer, { folder: 'nova/groups/covers' });
    group.cover = res.secure_url;
  }

  await group.save();

  // Update Settings
  const settings = await GroupSettings.findOne({ group: groupId });
  if (settings) {
    if (postModeration !== undefined) settings.postModeration = postModeration;
    if (membershipApprovalRequired !== undefined) settings.membershipApprovalRequired = membershipApprovalRequired;
    if (joinQuestions !== undefined) {
      settings.joinQuestions = Array.isArray(joinQuestions) ? joinQuestions : JSON.parse(joinQuestions);
    }
    await settings.save();
  }

  return getGroupById(groupId, userId);
}

export async function deleteGroup(groupId, userId) {
  const group = await Group.findById(groupId);
  if (!group) throw new NotFoundError('Group');

  const role = await getMemberRole(groupId, userId);
  if (role !== 'owner') {
    throw new ForbiddenError('Only the owner can delete the group');
  }

  // Cleanup all linked items
  await Promise.all([
    Group.findByIdAndDelete(groupId),
    GroupMember.deleteMany({ group: groupId }),
    GroupPost.deleteMany({ group: groupId }),
    GroupRule.deleteMany({ group: groupId }),
    GroupSettings.deleteMany({ group: group._id }),
    GroupInvitation.deleteMany({ group: groupId }),
    GroupJoinRequest.deleteMany({ group: groupId }),
    GroupReport.deleteMany({ group: groupId }),
  ]);

  return { success: true };
}

// ── MEMBERSHIP LOGIC ─────────────────────────────────────────────────────────

export async function joinGroup(groupId, userId, answers = []) {
  const group = await Group.findById(groupId);
  if (!group) throw new NotFoundError('Group');

  const settings = await GroupSettings.findOne({ group: groupId });
  const memberObj = await GroupMember.findOne({ group: groupId, user: userId });
  if (memberObj) {
    if (memberObj.isBlocked) throw new ForbiddenError('You have been banned from this group');
    throw new AppError('You are already a member', 400);
  }

  // If group requires membership approval
  if (settings?.membershipApprovalRequired) {
    const existingRequest = await GroupJoinRequest.findOne({ group: groupId, user: userId, status: 'pending' });
    if (existingRequest) throw new AppError('Membership request already pending', 400);

    const request = await GroupJoinRequest.create({
      group: groupId,
      user: userId,
      answers,
      status: 'pending',
    });

    // Notify Group Admins
    const admins = await GroupMember.find({ group: groupId, role: { $in: ['owner', 'admin'] } });
    admins.forEach((admin) => {
      createGroupNotification({
        recipient: admin.user,
        actor: userId,
        type: 'join_request',
        group: groupId,
        referenceId: request._id,
        message: 'requested to join your group',
      });
    });

    return { status: 'pending', request };
  }

  // Public group - join immediately
  const member = await GroupMember.create({
    group: groupId,
    user: userId,
    role: 'member',
  });

  return { status: 'joined', member };
}

export async function leaveGroup(groupId, userId) {
  const member = await GroupMember.findOne({ group: groupId, user: userId });
  if (!member) throw new AppError('You are not a member of this group', 400);

  if (member.role === 'owner') {
    throw new AppError('Owners cannot leave the group. Transfer ownership first.', 400);
  }

  await member.deleteOne();
  return { success: true };
}

export async function inviteMember(groupId, inviterId, inviteeId) {
  const isInviteeMember = await GroupMember.exists({ group: groupId, user: inviteeId });
  if (isInviteeMember) throw new AppError('User is already a member', 400);

  const existingInvitation = await GroupInvitation.findOne({ group: groupId, invitee: inviteeId, status: 'pending' });
  if (existingInvitation) throw new AppError('Invitation already sent', 400);

  const invite = await GroupInvitation.create({
    group: groupId,
    inviter: inviterId,
    invitee: inviteeId,
  });

  // Notify Invitee
  createGroupNotification({
    recipient: inviteeId,
    actor: inviterId,
    type: 'invitation',
    group: groupId,
    referenceId: invite._id,
    message: 'invited you to join a group',
  });

  return invite;
}

export async function respondToInvitation(invitationId, userId, action) {
  const invitation = await GroupInvitation.findById(invitationId);
  if (!invitation || invitation.invitee.toString() !== userId.toString()) {
    throw new NotFoundError('Invitation');
  }

  if (action === 'accept') {
    invitation.status = 'accepted';
    await invitation.save();

    const member = await GroupMember.create({
      group: invitation.group,
      user: userId,
      role: 'member',
    });

    return { status: 'accepted', member };
  } else {
    invitation.status = 'declined';
    await invitation.save();
    return { status: 'declined' };
  }
}

export async function listJoinRequests(groupId) {
  return GroupJoinRequest.find({ group: groupId, status: 'pending' })
    .populate('user', 'name username avatar')
    .sort({ createdAt: -1 })
    .lean();
}

export async function respondToJoinRequest(groupId, requestId, moderatorId, action) {
  const request = await GroupJoinRequest.findById(requestId);
  if (!request || request.group.toString() !== groupId.toString()) {
    throw new NotFoundError('Join request');
  }

  if (action === 'approve') {
    request.status = 'approved';
    await request.save();

    const member = await GroupMember.create({
      group: request.group,
      user: request.user,
      role: 'member',
    });

    createGroupNotification({
      recipient: request.user,
      actor: moderatorId,
      type: 'join_approved',
      group: request.group,
      referenceId: member._id,
      message: 'approved your request to join the group',
    });

    return { status: 'approved', member };
  } else {
    request.status = 'rejected';
    await request.save();

    createGroupNotification({
      recipient: request.user,
      actor: moderatorId,
      type: 'post_rejected',
      group: request.group,
      message: 'declined your request to join the group',
    });

    return { status: 'rejected' };
  }
}

export async function listGroupMembers(groupId, query) {
  const filter = { group: groupId };
  if (query.blocked === 'true') {
    filter.isBlocked = true;
  } else {
    filter.isBlocked = { $ne: true };
  }

  const total = await GroupMember.countDocuments(filter);
  const { skip, limit, meta } = paginate(query, total);

  const members = await GroupMember.find(filter)
    .populate('user', 'name username avatar isOnline')
    .sort({ role: 1, joinedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return { members, meta };
}

export async function updateMemberRole(groupId, adminId, targetUserId, newRole) {
  const adminMember = await GroupMember.findOne({ group: groupId, user: adminId });
  const targetMember = await GroupMember.findOne({ group: groupId, user: targetUserId });

  if (!targetMember) throw new NotFoundError('Member');

  if (adminMember.role === 'owner') {
    // Owner can change anyone
    if (newRole === 'owner') {
      // Transfer Ownership
      targetMember.role = 'owner';
      adminMember.role = 'admin';
      await adminMember.save();
    } else {
      targetMember.role = newRole;
    }
  } else if (adminMember.role === 'admin') {
    // Admins can only elevate to mod, or demote mod
    if (targetMember.role === 'owner' || targetMember.role === 'admin') {
      throw new ForbiddenError('You cannot change roles of users at or above your level');
    }
    if (newRole === 'owner' || newRole === 'admin') {
      throw new ForbiddenError('You cannot elevate someone to Admin or Owner');
    }
    targetMember.role = newRole;
  } else {
    throw new ForbiddenError('Insufficient permissions to change roles');
  }

  await targetMember.save();

  createGroupNotification({
    recipient: targetUserId,
    actor: adminId,
    type: 'role_changed',
    group: groupId,
    referenceId: targetMember._id,
    message: `updated your role in the group to ${newRole}`,
  });

  return targetMember;
}

export async function updateMemberStatus(groupId, adminId, targetUserId, statusUpdates) {
  const adminMember = await GroupMember.findOne({ group: groupId, user: adminId });
  const targetMember = await GroupMember.findOne({ group: groupId, user: targetUserId });

  if (!targetMember) throw new NotFoundError('Member');
  if (targetMember.role === 'owner') throw new ForbiddenError('Cannot modify group owner status');

  const { isMuted, isBlocked } = statusUpdates;

  // Block authorization: only owner and admin can block
  if (isBlocked !== undefined && isBlocked !== targetMember.isBlocked) {
    if (!['owner', 'admin'].includes(adminMember.role)) {
      throw new ForbiddenError('Only group owners and admins can block/unblock members');
    }
    targetMember.isBlocked = isBlocked;
    if (isBlocked) {
      targetMember.role = 'member'; // Reset role on block
    }
  }

  // Mute authorization: owner, admin, and moderator can mute
  if (isMuted !== undefined && isMuted !== targetMember.isMuted) {
    targetMember.isMuted = isMuted;
  }

  await targetMember.save();
  return targetMember;
}

export async function kickMember(groupId, moderatorId, targetUserId) {
  const modRole = await getMemberRole(groupId, moderatorId);
  const targetMember = await GroupMember.findOne({ group: groupId, user: targetUserId });

  if (!targetMember) throw new NotFoundError('Member');

  if (targetMember.role === 'owner') throw new ForbiddenError('Cannot kick group Owner');

  if (modRole === 'moderator' && (targetMember.role === 'admin' || targetMember.role === 'moderator')) {
    throw new ForbiddenError('Moderators cannot kick other mods or admins');
  }

  await targetMember.deleteOne();
  return { success: true };
}

// ── GROUP POSTS LOGIC ────────────────────────────────────────────────────────

export async function createGroupPost(groupId, authorId, content, files = []) {
  const member = await GroupMember.findOne({ group: groupId, user: authorId });
  if (member && member.isMuted) {
    throw new ForbiddenError('You are muted and cannot post in this group');
  }

  const settings = await GroupSettings.findOne({ group: groupId });
  const isApproved = settings ? !settings.postModeration : true;

  const role = await getMemberRole(groupId, authorId);
  // Owner, Admins, Mods always auto-approve
  const autoApprove = role && ['owner', 'admin', 'moderator'].includes(role);

  const post = await GroupPost.create({
    group: groupId,
    author: authorId,
    content: content || '',
    isApproved: autoApprove || isApproved,
  });

  // Handle media uploads
  const mediaItems = await Promise.all(
    files.map(async (file) => {
      const isVideo = file.mimetype.startsWith('video/');
      const result = await uploadToCloudinary(file.buffer, {
        folder: `nova/groups/${groupId}/posts`,
        resource_type: isVideo ? 'video' : 'image',
      });

      return GroupPostMedia.create({
        post: post._id,
        url: result.secure_url,
        type: isVideo ? 'video' : 'image',
        publicId: result.public_id,
      });
    })
  );

  if (!post.isApproved) {
    // Notify moderators
    const moderators = await GroupMember.find({ group: groupId, role: { $in: ['owner', 'admin', 'moderator'] } });
    moderators.forEach((mod) => {
      createGroupNotification({
        recipient: mod.user,
        actor: authorId,
        type: 'post_pending',
        group: groupId,
        referenceId: post._id,
        message: 'submitted a post for review',
      });
    });
  }

  const populated = await post.populate('author', 'name username avatar');
  return {
    ...populated.toObject(),
    media: mediaItems,
  };
}

export async function getGroupPosts(groupId, userId, query) {
  const filter = { group: groupId, isApproved: true };
  const { query: cursorQuery, limit } = cursorPaginate(query.cursor, query.limit || 20);

  // Fetch pinned posts first
  const pinnedPosts = await GroupPost.find({ group: groupId, isApproved: true, isPinned: true })
    .populate('author', 'name username avatar')
    .sort({ createdAt: -1 })
    .lean();

  // Attach media to pinned posts
  for (let post of pinnedPosts) {
    post.media = await GroupPostMedia.find({ post: post._id }).lean();
  }

  // Fetch normal posts
  const posts = await GroupPost.find({
    ...filter,
    isPinned: false,
    ...cursorQuery,
  })
    .populate('author', 'name username avatar')
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .lean();

  const hasNextPage = posts.length > limit;
  const data = hasNextPage ? posts.slice(0, limit) : posts;
  const nextCursor = hasNextPage ? data[data.length - 1]._id : null;

  // Attach media and reactions mapping
  const postIds = data.map((p) => p._id);
  const mediaMap = {};
  const mediaList = await GroupPostMedia.find({ post: { $in: postIds } }).lean();
  mediaList.forEach((m) => {
    if (!mediaMap[m.post.toString()]) mediaMap[m.post.toString()] = [];
    mediaMap[m.post.toString()].push(m);
  });

  let reactionMap = {};
  if (userId) {
    const reactions = await Reaction.find({
      user: userId,
      target: { $in: postIds },
      targetModel: 'GroupPost',
    }).lean();
    reactions.forEach((r) => {
      reactionMap[r.target.toString()] = r.type;
    });
  }

  data.forEach((post) => {
    post.media = mediaMap[post._id.toString()] || [];
    post.userReaction = reactionMap[post._id.toString()] || null;
  });

  return {
    pinnedPosts,
    posts: data,
    nextCursor,
    hasNextPage,
  };
}

export async function getPendingPosts(groupId) {
  const posts = await GroupPost.find({ group: groupId, isApproved: false })
    .populate('author', 'name username avatar')
    .sort({ createdAt: -1 })
    .lean();

  for (let post of posts) {
    post.media = await GroupPostMedia.find({ post: post._id }).lean();
  }

  return posts;
}

export async function approvePost(groupId, postId, moderatorId) {
  const post = await GroupPost.findOne({ _id: postId, group: groupId });
  if (!post) throw new NotFoundError('Post');

  post.isApproved = true;
  await post.save();

  // Notify Author
  createGroupNotification({
    recipient: post.author,
    actor: moderatorId,
    type: 'new_post',
    group: groupId,
    referenceId: post._id,
    message: 'approved your post inside the group',
  });

  return post;
}

export async function deleteGroupPost(groupId, postId, userId) {
  const post = await GroupPost.findOne({ _id: postId, group: groupId });
  if (!post) throw new NotFoundError('Post');

  const role = await getMemberRole(groupId, userId);
  const isAuthor = post.author.toString() === userId.toString();
  const isMod = role && ['owner', 'admin', 'moderator'].includes(role);

  if (!isAuthor && !isMod) {
    throw new ForbiddenError('You do not have permission to delete this post');
  }

  // Delete media files from Cloudinary
  const mediaItems = await GroupPostMedia.find({ post: postId });
  await Promise.all(
    mediaItems.map((m) => deleteFromCloudinary(m.publicId, m.type))
  );

  await Promise.all([
    post.deleteOne(),
    GroupPostMedia.deleteMany({ post: postId }),
    Comment.deleteMany({ post: postId, postModel: 'GroupPost' }),
    Reaction.deleteMany({ target: postId, targetModel: 'GroupPost' }),
  ]);

  return { success: true };
}

export async function reactToGroupPost(groupId, postId, userId, reactionType) {
  const post = await GroupPost.findOne({ _id: postId, group: groupId });
  if (!post) throw new NotFoundError('Post');

  const existing = await Reaction.findOne({ user: userId, target: postId, targetModel: 'GroupPost' });

  if (existing) {
    if (existing.type === reactionType) {
      await existing.deleteOne();
      await GroupPost.findByIdAndUpdate(postId, {
        $inc: { [`reactionCounts.${reactionType}`]: -1, totalReactions: -1 },
      });
      return { action: 'removed', type: null };
    } else {
      const oldType = existing.type;
      existing.type = reactionType;
      await existing.save();
      await GroupPost.findByIdAndUpdate(postId, {
        $inc: {
          [`reactionCounts.${oldType}`]: -1,
          [`reactionCounts.${reactionType}`]: 1,
        },
      });
      return { action: 'updated', type: reactionType };
    }
  } else {
    await Reaction.create({ type: reactionType, user: userId, target: postId, targetModel: 'GroupPost' });
    await GroupPost.findByIdAndUpdate(postId, {
      $inc: { [`reactionCounts.${reactionType}`]: 1, totalReactions: 1 },
    });
    return { action: 'added', type: reactionType };
  }
}

export async function pinGroupPost(groupId, postId, moderatorId) {
  const post = await GroupPost.findOne({ _id: postId, group: groupId });
  if (!post) throw new NotFoundError('Post');

  post.isPinned = !post.isPinned;
  await post.save();
  return post;
}

// ── RULES & REPORTS ──────────────────────────────────────────────────────────

export async function createRule(groupId, data) {
  return GroupRule.create({
    group: groupId,
    title: data.title,
    detail: data.detail,
  });
}

export async function deleteRule(groupId, ruleId) {
  const rule = await GroupRule.findOneAndDelete({ _id: ruleId, group: groupId });
  if (!rule) throw new NotFoundError('Rule');
  return { success: true };
}

export async function reportGroupItem(groupId, reporterId, data) {
  const { targetType, targetId, reason, description } = data;
  return GroupReport.create({
    group: groupId,
    reporter: reporterId,
    targetType,
    targetId,
    reason,
    description: description || '',
  });
}

export async function listReports(groupId) {
  return GroupReport.find({ group: groupId, status: 'pending' })
    .populate('reporter', 'name username avatar')
    .sort({ createdAt: -1 })
    .lean();
}

export async function resolveReport(groupId, reportId, status) {
  const report = await GroupReport.findOne({ _id: reportId, group: groupId });
  if (!report) throw new NotFoundError('Report');

  report.status = status;
  await report.save();
  return report;
}
