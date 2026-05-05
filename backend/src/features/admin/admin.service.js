import User from '../users/users.model.js';
import Post from '../posts/posts.model.js';
import Report from '../posts/report.model.js';
import Comment from '../comments/comments.model.js';
import Reel from '../reels/reels.model.js';
import { Group, GroupMember } from '../groups/groups.model.js';
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../../shared/errors/index.js';
import { paginate } from '../../shared/utils/pagination.utils.js';
import { createNotification } from '../notifications/notifications.service.js';

// ── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const [totalUsers, totalPosts, pendingReports, newUsersToday] = await Promise.all([
    User.countDocuments(),
    Post.countDocuments({ isDeleted: { $ne: true } }),
    Report.countDocuments({ status: 'pending' }),
    User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
  ]);

  return { totalUsers, totalPosts, pendingReports, newUsersToday };
}

// ── Analytics (admin-only) ───────────────────────────────────────────────────

export async function getAnalytics() {
  const days = 7;
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  // Build a lookup map of day-label → counts using aggregation
  const groupByDay = {
    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
  };

  const [userAgg, postAgg] = await Promise.all([
    User.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: groupByDay, count: { $sum: 1 } } },
    ]),
    Post.aggregate([
      { $match: { createdAt: { $gte: since }, isDeleted: { $ne: true } } },
      { $group: { _id: groupByDay, count: { $sum: 1 } } },
    ]),
  ]);

  // Build lookup maps keyed by ISO date string
  const userMap = Object.fromEntries(userAgg.map((d) => [d._id, d.count]));
  const postMap = Object.fromEntries(postAgg.map((d) => [d._id, d.count]));

  // Generate ordered result for the last 7 days
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const isoDay = day.toISOString().slice(0, 10);
    result.push({
      date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      newUsers: userMap[isoDay] || 0,
      newPosts: postMap[isoDay] || 0,
    });
  }

  return result;
}

// ── Users ────────────────────────────────────────────────────────────────────

export async function getUsers(query) {
  const filter = {};
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { username: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
    ];
  }
  if (query.role) filter.role = query.role;
  if (query.isBanned !== undefined) filter.isBanned = query.isBanned === 'true';

  const total = await User.countDocuments(filter);
  const { skip, limit, meta } = paginate(query, total);

  const users = await User.find(filter)
    .select('-password -passwordResetToken -emailVerifyToken')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return { users, meta };
}

export async function banUser(userId, isBanned, requesterId, banReason = null, durationDays = null) {
  if (userId.toString() === requesterId.toString()) {
    throw new ForbiddenError('You cannot ban your own account');
  }

  let banExpiresAt = null;
  if (isBanned && durationDays) {
    banExpiresAt = new Date();
    banExpiresAt.setDate(banExpiresAt.getDate() + parseInt(durationDays, 10));
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      isBanned,
      banReason: isBanned ? banReason : null,
      banExpiresAt: isBanned ? banExpiresAt : null
    },
    { new: true }
  ).select('-password');

  if (!user) throw new NotFoundError('User');

  // Notify the affected user
  if (isBanned) {
    const expiresMsg = banExpiresAt
      ? ` until ${new Date(banExpiresAt).toLocaleString()}`
      : ' permanently';
    const reasonMsg = banReason ? ` Reason: ${banReason}.` : '';
    createNotification({
      type: 'system',
      recipient: userId,
      actor: requesterId,
      message: `your account has been suspended${expiresMsg}.${reasonMsg} Contact support if you believe this is a mistake.`,
    }).catch(() => {});
  } else {
    createNotification({
      type: 'system',
      recipient: userId,
      actor: requesterId,
      message: 'your account suspension has been lifted. Welcome back!',
    }).catch(() => {});
  }

  return user;
}

export async function warnUser(userId, requesterId, reason) {
  if (userId.toString() === requesterId.toString()) {
    throw new ForbiddenError('You cannot warn your own account');
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) throw new NotFoundError('User');

  targetUser.warnings.push({
    reason,
    warnedBy: requesterId,
    createdAt: new Date()
  });

  await targetUser.save();

  // Create notification for the user
  createNotification({
    type: 'system',
    recipient: userId,
    actor: requesterId,
    message: `received a warning: "${reason}"`,
  }).catch(() => {});

  return targetUser.warnings;
}

export async function changeUserRole(userId, role) {
  const validRoles = ['user', 'moderator'];
  if (!validRoles.includes(role)) {
    throw new ValidationError('Cannot change user role to admin');
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) throw new NotFoundError('User');
  if (targetUser.role === 'admin') {
    throw new ForbiddenError('Cannot change the role of an admin');
  }

  const user = await User.findByIdAndUpdate(userId, { role }, { new: true }).select('-password');
  return user;
}

// Admin-only
export async function deleteUser(userId, requesterId) {
  if (userId.toString() === requesterId.toString()) {
    throw new ForbiddenError('You cannot delete your own account');
  }
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User');
  // Remove user's posts (soft delete)
  await Post.updateMany({ author: userId }, { isDeleted: true });
  await user.deleteOne();
}

// ── Posts (admin-only) ────────────────────────────────────────────────────────

export async function getPosts(query) {
  const filter = { isDeleted: { $ne: true } };
  if (query.search) {
    filter.content = { $regex: query.search, $options: 'i' };
  }

  const total = await Post.countDocuments(filter);
  const { skip, limit, meta } = paginate(query, total);

  const posts = await Post.find(filter)
    .populate('author', 'name username avatar')
    .select('content author createdAt likesCount commentsCount images')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return { posts, meta };
}

export async function deletePost(postId) {
  const post = await Post.findById(postId);
  if (!post) throw new NotFoundError('Post');
  post.isDeleted = true;
  await post.save();
}

// ── Reports ───────────────────────────────────────────────────────────────────

export async function getReports(query) {
  const filter = query.status ? { status: query.status } : {};
  const total = await Report.countDocuments(filter);
  const { skip, limit, meta } = paginate(query, total);

  const reports = await Report.find(filter)
    .populate('reporter', 'name username avatar')
    .populate({
      path: 'target',
      options: { includeDeleted: true }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return { reports, meta };
}

export async function reviewReport(reportId, adminId, action, actionTaken) {
  const report = await Report.findById(reportId);
  if (!report) throw new NotFoundError('Report');

  report.status = action;
  report.reviewedBy = adminId;
  report.reviewedAt = new Date();
  
  const reviewer = await User.findById(adminId).select('role');
  const roleLabel = reviewer?.role === 'moderator' ? 'moderator' : 'admin';

  if (actionTaken) {
    report.actionTaken = actionTaken;
  } else {
    report.actionTaken = action === 'resolved' 
      ? `Target ${report.targetModel} restricted/deleted by ${roleLabel}`
      : `Report dismissed by ${roleLabel}`;
  }

  await report.save();

  if (action === 'resolved') {
    if (report.targetModel === 'Post') {
      await Post.findByIdAndUpdate(report.target, { isDeleted: true });
    } else if (report.targetModel === 'Comment') {
      await Comment.findByIdAndUpdate(report.target, { isDeleted: true });
    } else if (report.targetModel === 'User') {
      await User.findByIdAndUpdate(report.target, { isBanned: true });
    } else if (report.targetModel === 'Reel') {
      await Reel.findByIdAndUpdate(report.target, { isDeleted: true });
    }
  }

  const populated = await Report.findById(reportId)
    .populate('reporter', 'name username avatar')
    .populate('reviewedBy', 'name username avatar');

  return populated;
}

// ── Manual account creation (admin-only) ─────────────────────────────────────

export async function createAccount({ name, username, email, password, role }) {
  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) throw new ConflictError('Email or username already in use');

  const validRoles = ['user', 'moderator'];
  if (!validRoles.includes(role)) {
    throw new ValidationError('Cannot create an admin account');
  }

  const user = await User.create({ name, username, email, password, role, isEmailVerified: true });
  return user.toPublicProfile();
}

// ── Reels (admin/moderator) ──────────────────────────────────────────────────

export async function getReels(query) {
  const filter = { isDeleted: { $ne: true } };
  if (query.search) {
    filter.caption = { $regex: query.search, $options: 'i' };
  }

  const total = await Reel.countDocuments(filter);
  const { skip, limit, meta } = paginate(query, total);

  const reels = await Reel.find(filter)
    .populate('author', 'name username avatar')
    .select('caption author createdAt video visibility reactionCounts totalReactions commentCount viewCount')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return { reels, meta };
}

export async function deleteReel(reelId) {
  const reel = await Reel.findById(reelId);
  if (!reel) throw new NotFoundError('Reel');
  
  reel.isDeleted = true;
  await reel.save();
}

// ── Groups (admin/moderator) ─────────────────────────────────────────────────

export async function getGroups(query) {
  const filter = {};
  if (query.search) {
    filter.name = { $regex: query.search, $options: 'i' };
  }

  const total = await Group.countDocuments(filter);
  const { skip, limit, meta } = paginate(query, total);

  const groups = await Group.find(filter)
    .populate('creator', 'name username avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // Load member counts for all matching groups
  const groupIds = groups.map((g) => g._id);
  const memberCounts = await GroupMember.aggregate([
    { $match: { group: { $in: groupIds } } },
    { $group: { _id: '$group', count: { $sum: 1 } } }
  ]);
  const memberCountMap = Object.fromEntries(
    memberCounts.map((d) => [d._id.toString(), d.count])
  );

  const groupsWithStats = groups.map((g) => ({
    ...g,
    memberCount: memberCountMap[g._id.toString()] || 0
  }));

  return { groups: groupsWithStats, meta };
}

export async function banGroup(groupId, isBanned, banReason) {
  const group = await Group.findByIdAndUpdate(
    groupId,
    { isBanned, banReason: isBanned ? banReason : null },
    { new: true }
  ).populate('creator', 'name username avatar');
  
  if (!group) throw new NotFoundError('Group');
  return group;
}
