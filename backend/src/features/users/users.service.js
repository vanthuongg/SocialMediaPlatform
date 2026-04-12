import User from './users.model.js';
import FriendRequest from './friendRequest.model.js';
import Post from '../posts/posts.model.js';
import { NotFoundError, ConflictError, AppError } from '../../shared/errors/index.js';
import { uploadToCloudinary, deleteFromCloudinary, extractPublicId } from '../../shared/utils/cloudinary.utils.js';
import { paginate } from '../../shared/utils/pagination.utils.js';
import { createNotification } from '../notifications/notifications.service.js';

/**
 * Fetches a public user profile by username.
 */
export async function getUserProfile(username, currentUserId) {
  const user = await User.findOne({ username })
    .select('-password -passwordResetToken -passwordResetExpires -emailVerifyToken -emailVerifyExpires')
    .lean();

  if (!user) throw new NotFoundError('User');

  const isOwnProfile = currentUserId && user._id.toString() === currentUserId.toString();
  const isFriend = currentUserId && (user.friends || []).some((id) => id.toString() === currentUserId.toString());
  const isFollowing = currentUserId && (user.following || []).some((id) => id.toString() === currentUserId.toString());

  let hasSentFriendRequest = false;
  let hasReceivedFriendRequest = false;

  if (currentUserId && !isOwnProfile && !isFriend) {
    const friendRequest = await FriendRequest.findOne({
      $or: [
        { sender: currentUserId, receiver: user._id },
        { sender: user._id, receiver: currentUserId },
      ],
      status: 'pending'
    });

    if (friendRequest) {
      if (friendRequest.sender.toString() === currentUserId.toString()) {
        hasSentFriendRequest = true;
      } else {
        hasReceivedFriendRequest = true;
      }
    }
  }

  // Respect privacy settings
  const profileVisibility = user.privacySettings?.profileVisibility || 'public';
  const canViewFullProfile =
    isOwnProfile ||
    profileVisibility === 'public' ||
    (profileVisibility === 'friends' && isFriend);

  if (!canViewFullProfile) {
    return {
      _id: user._id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      isPrivate: true,
      hasSentFriendRequest,
      hasReceivedFriendRequest,
    };
  }

  return {
    ...user,
    isOwnProfile,
    isFriend,
    isFollowing: (user.followers || []).some((id) => id.toString() === currentUserId?.toString()),
    isBlocked: currentUserId
      ? (user.blockedUsers || []).some((id) => id.toString() === currentUserId.toString())
      : false,
    hasSentFriendRequest,
    hasReceivedFriendRequest,
  };
}

/**
 * Updates the current user's profile information.
 */
export async function updateProfile(userId, updates, files = {}) {
  const allowedFields = [
    'name', 'bio', 'website', 'location', 'dateOfBirth', 'gender',
    'work', 'education', 'relationshipStatus', 'hobbies',
    'notificationSettings', 'privacySettings'
  ];
  
  const sanitizedUpdates = {};
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      if (field === 'hobbies' && typeof updates[field] === 'string') {
        sanitizedUpdates[field] = updates[field].split(',').map(h => h.trim()).filter(Boolean);
      } else {
        sanitizedUpdates[field] = updates[field];
      }
    }
  });

  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User');

  // Handle avatar upload
  if (files.avatar && files.avatar[0]) {
    if (user.avatarPublicId) {
      await deleteFromCloudinary(user.avatarPublicId, 'image').catch(() => {});
    }
    const result = await uploadToCloudinary(files.avatar[0].buffer, {
      folder: 'nova/avatars',
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    });
    sanitizedUpdates.avatar = result.secure_url;
    sanitizedUpdates.avatarPublicId = result.public_id;
  }

  // Handle cover upload
  if (files.cover && files.cover[0]) {
    if (user.coverPublicId) {
      await deleteFromCloudinary(user.coverPublicId, 'image').catch(() => {});
    }
    const result = await uploadToCloudinary(files.cover[0].buffer, {
      folder: 'nova/covers',
      transformation: [{ width: 1200, height: 400, crop: 'fill' }],
    });
    sanitizedUpdates.cover = result.secure_url;
    sanitizedUpdates.coverPublicId = result.public_id;
  }

  const updatedUser = await User.findByIdAndUpdate(userId, sanitizedUpdates, {
    new: true,
    runValidators: true,
  }).select('-password');

  return updatedUser;
}

/**
 * Follow a user.
 */
export async function followUser(currentUserId, targetUserId) {
  if (currentUserId.toString() === targetUserId.toString()) {
    throw new AppError('You cannot follow yourself', 400, 'INVALID_ACTION');
  }

  const [currentUser, targetUser] = await Promise.all([
    User.findById(currentUserId),
    User.findById(targetUserId),
  ]);

  if (!targetUser) throw new NotFoundError('User');

  const alreadyFollowing = currentUser.following.includes(targetUserId);
  if (alreadyFollowing) throw new ConflictError('You are already following this user');

  await Promise.all([
    User.findByIdAndUpdate(currentUserId, {
      $addToSet: { following: targetUserId },
      $inc: { followingCount: 1 },
    }),
    User.findByIdAndUpdate(targetUserId, {
      $addToSet: { followers: currentUserId },
      $inc: { followersCount: 1 },
    }),
  ]);
}

/**
 * Unfollow a user.
 */
export async function unfollowUser(currentUserId, targetUserId) {
  const currentUser = await User.findById(currentUserId).select('following').lean();
  if (!currentUser) return;

  const isFollowing = (currentUser.following || []).some(
    (id) => id.toString() === targetUserId.toString()
  );
  if (!isFollowing) return; // Not following — nothing to do

  await Promise.all([
    User.findByIdAndUpdate(currentUserId, {
      $pull: { following: targetUserId },
      $inc: { followingCount: -1 },
    }),
    User.findByIdAndUpdate(targetUserId, {
      $pull: { followers: currentUserId },
      $inc: { followersCount: -1 },
    }),
  ]);
}

/**
 * Send a friend request.
 */
export async function sendFriendRequest(senderId, receiverId) {
  if (senderId.toString() === receiverId.toString()) {
    throw new AppError('You cannot send a friend request to yourself', 400, 'INVALID_ACTION');
  }

  const receiver = await User.findById(receiverId);
  if (!receiver) throw new NotFoundError('User');

  const existing = await FriendRequest.findOne({
    $or: [
      { sender: senderId, receiver: receiverId },
      { sender: receiverId, receiver: senderId },
    ],
  });

  if (existing) {
    if (existing.status === 'accepted') {
      throw new ConflictError('You are already friends with this user');
    }
    if (existing.status === 'pending') {
      throw new ConflictError('A friend request already exists');
    }

    // Revive declined friend request
    existing.sender = senderId;
    existing.receiver = receiverId;
    existing.status = 'pending';
    await existing.save();

    await createNotification({
      type: 'friend_request',
      recipient: receiverId,
      actor: senderId,
      entity: senderId,
      entityModel: 'User',
      message: 'sent you a friend request',
    });

    return existing;
  }

  const friendRequest = await FriendRequest.create({ sender: senderId, receiver: receiverId });

  await createNotification({
    type: 'friend_request',
    recipient: receiverId,
    actor: senderId,
    entity: senderId,
    entityModel: 'User',
    message: 'sent you a friend request',
  });

  return friendRequest;
}

/**
 * Accept or decline a friend request.
 */
export async function respondToFriendRequest(requestIdOrSenderId, receiverId, action) {
  const request = await FriendRequest.findOne({
    $or: [
      { _id: requestIdOrSenderId, receiver: receiverId, status: 'pending' },
      { sender: requestIdOrSenderId, receiver: receiverId, status: 'pending' },
    ],
  });

  if (!request) throw new NotFoundError('Friend request');

  if (action === 'accept') {
    request.status = 'accepted';
    await request.save();

    // Add to each other's friends list
    await Promise.all([
      User.findByIdAndUpdate(request.sender, {
        $addToSet: { friends: receiverId },
        $inc: { friendsCount: 1 },
      }),
      User.findByIdAndUpdate(receiverId, {
        $addToSet: { friends: request.sender },
        $inc: { friendsCount: 1 },
      }),
    ]);

    await createNotification({
      type: 'friend_accept',
      recipient: request.sender,
      actor: receiverId,
      entity: receiverId,
      entityModel: 'User',
      message: 'accepted your friend request',
    });
  } else {
    request.status = 'declined';
    await request.save();
  }

  return request;
}

/**
 * Get friend suggestions (users not currently friends or following).
 */
export async function getFriendSuggestions(userId, query) {
  const user = await User.findById(userId).lean();
  if (!user) throw new NotFoundError('User');

  // Find all friend requests related to this user (pending or accepted)
  const friendRequests = await FriendRequest.find({
    $or: [{ sender: userId }, { receiver: userId }],
    status: { $in: ['pending', 'accepted'] },
  }).lean();

  const requestUserIds = friendRequests.map((r) =>
    r.sender.toString() === userId.toString() ? r.receiver.toString() : r.sender.toString()
  );

  const excludeIds = [
    userId,
    ...(user.friends || []).map(id => id.toString()),
    ...(user.following || []).map(id => id.toString()),
    ...requestUserIds,
  ];

  const total = await User.countDocuments({ _id: { $nin: excludeIds } });
  const { skip, limit, meta } = paginate(query, total);

  const suggestions = await User.find({ _id: { $nin: excludeIds } })
    .select('name username avatar bio followersCount friendsCount')
    .skip(skip)
    .limit(limit)
    .lean();

  return { suggestions, meta };
}

/**
 * Search users by name or username.
 */
export async function searchUsers(searchQuery, paginationQuery) {
  const filter = {
    $or: [
      { name: { $regex: searchQuery, $options: 'i' } },
      { username: { $regex: searchQuery, $options: 'i' } },
    ],
  };

  const total = await User.countDocuments(filter);
  const { skip, limit, meta } = paginate(paginationQuery, total);

  const users = await User.find(filter)
    .select('name username avatar bio followersCount friendsCount')
    .skip(skip)
    .limit(limit)
    .lean();

  return { users, meta };
}

/**
 * Get friends list for a user.
 */
export async function getFriends(userId, paginationQuery) {
  const user = await User.findById(userId).lean();
  if (!user) throw new NotFoundError('User');

  const total = (user.friends || []).length;
  const { skip, limit, meta } = paginate(paginationQuery, total);

  const friends = await User.find({ _id: { $in: user.friends || [] } })
    .select('name username avatar bio isOnline lastSeen')
    .skip(skip)
    .limit(limit)
    .lean();

  return { friends, meta };
}

/**
 * Get pending friend requests for current user.
 */
export async function getPendingFriendRequests(userId, paginationQuery) {
  const total = await FriendRequest.countDocuments({ receiver: userId, status: 'pending' });
  const { skip, limit, meta } = paginate(paginationQuery, total);

  const requests = await FriendRequest.find({ receiver: userId, status: 'pending' })
    .populate('sender', 'name username avatar bio friendsCount')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return { requests, meta };
}

/**
 * Get followers list for a user.
 */
export async function getFollowers(userId, paginationQuery) {
  const user = await User.findById(userId).lean();
  if (!user) throw new NotFoundError('User');

  const total = (user.followers || []).length;
  const { skip, limit, meta } = paginate(paginationQuery, total);

  const followers = await User.find({ _id: { $in: user.followers || [] } })
    .select('name username avatar bio isOnline lastSeen')
    .skip(skip)
    .limit(limit)
    .lean();

  return { followers, meta };
}

/**
 * Get following list for a user.
 */
export async function getFollowing(userId, paginationQuery) {
  const user = await User.findById(userId).lean();
  if (!user) throw new NotFoundError('User');

  const total = (user.following || []).length;
  const { skip, limit, meta } = paginate(paginationQuery, total);

  const following = await User.find({ _id: { $in: user.following || [] } })
    .select('name username avatar bio isOnline lastSeen')
    .skip(skip)
    .limit(limit)
    .lean();

  return { following, meta };
}

/**
 * Blocks a user. Removes any existing follow/friend relationship.
 */
export async function blockUser(currentUserId, targetUserId) {
  if (currentUserId.toString() === targetUserId.toString()) {
    throw new AppError('You cannot block yourself', 400);
  }

  const [currentUser, targetUser] = await Promise.all([
    User.findById(currentUserId),
    User.findById(targetUserId),
  ]);
  if (!currentUser) throw new NotFoundError('User');
  if (!targetUser) throw new NotFoundError('User to block');

  const alreadyBlocked = (currentUser.blockedUsers || []).some(
    (id) => id.toString() === targetUserId.toString()
  );
  if (alreadyBlocked) throw new ConflictError('User is already blocked');

  // Remove any follow relationship (both directions)
  await User.findByIdAndUpdate(currentUserId, {
    $pull: { following: targetUserId, followers: targetUserId, friends: targetUserId },
    $addToSet: { blockedUsers: targetUserId },
  });
  await User.findByIdAndUpdate(targetUserId, {
    $pull: { following: currentUserId, followers: currentUserId, friends: currentUserId },
    $inc: { followersCount: -1, friendsCount: -1 },
  });

  // Cancel any pending friend requests
  await FriendRequest.deleteMany({
    $or: [
      { sender: currentUserId, receiver: targetUserId },
      { sender: targetUserId, receiver: currentUserId },
    ],
    status: 'pending',
  });
}

/**
 * Unblocks a previously blocked user.
 */
export async function unblockUser(currentUserId, targetUserId) {
  const currentUser = await User.findById(currentUserId);
  if (!currentUser) throw new NotFoundError('User');

  const isBlocked = (currentUser.blockedUsers || []).some(
    (id) => id.toString() === targetUserId.toString()
  );
  if (!isBlocked) throw new AppError('User is not blocked', 400);

  await User.findByIdAndUpdate(currentUserId, {
    $pull: { blockedUsers: targetUserId },
  });
}

/**
 * Gets the list of users blocked by the current user.
 */
export async function getBlockedUsers(userId) {
  const user = await User.findById(userId)
    .populate('blockedUsers', 'name username avatar bio')
    .lean();

  if (!user) throw new NotFoundError('User');
  return user.blockedUsers || [];
}

