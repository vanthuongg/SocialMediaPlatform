import Post from './posts.model.js';
import Reel from '../reels/reels.model.js';
import { GroupPost, GroupMember, GroupPostMedia } from '../groups/groups.model.js';
import Reaction from './reaction.model.js';
import SavedPost from './savedPost.model.js';
import Report from './report.model.js';
import User from '../users/users.model.js';
import { NotFoundError, ForbiddenError, ConflictError, AppError } from '../../shared/errors/index.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../../shared/utils/cloudinary.utils.js';
import { cursorPaginate, paginate } from '../../shared/utils/pagination.utils.js';
import { getIO } from '../../socket/index.js';
import * as notificationService from '../notifications/notifications.service.js';

const SHARED_POST_POPULATE = {
  path: 'sharedPost',
  select: 'content media author caption video sharedModel createdAt group mentions',
  options: { strictPopulate: false },
  populate: [
    { path: 'author', select: 'name username avatar' },
    { path: 'media' },
    { path: 'group', select: 'name avatar' },
    { path: 'mentions', select: 'name username' },
  ],
};

/**
 * Creates a new post with optional media uploads.
 */
export async function createPost(authorId, postData, files = []) {
  const { content, visibility, hashtags, mentions } = postData;

  if (!content && files.length === 0) {
    throw new AppError('Post must have content or media', 400, 'EMPTY_POST');
  }

  // Upload media to Cloudinary
  const mediaUploads = await Promise.all(
    files.map(async (file) => {
      const isVideo = file.mimetype.startsWith('video/');
      const result = await uploadToCloudinary(file.buffer, {
        folder: `nova/posts/${authorId}`,
        resource_type: isVideo ? 'video' : 'image',
      });
      return {
        url: result.secure_url,
        publicId: result.public_id,
        type: isVideo ? 'video' : 'image',
        width: result.width,
        height: result.height,
        duration: result.duration,
      };
    })
  );

  // Parse hashtags from content
  const contentHashtags = content?.match(/#([a-zA-Z0-9_]+)/g)?.map((t) => t.slice(1).toLowerCase()) || [];
  const allHashtags = [...new Set([...(hashtags || []), ...contentHashtags])];

  // Parse mentions robustly
  let parsedMentions = [];
  if (mentions) {
    if (Array.isArray(mentions)) {
      parsedMentions = mentions;
    } else if (typeof mentions === 'string' && mentions.trim()) {
      if (mentions.startsWith('[')) {
        try {
          parsedMentions = JSON.parse(mentions);
        } catch {
          parsedMentions = [mentions];
        }
      } else {
        parsedMentions = mentions.split(',').map(id => id.trim()).filter(Boolean);
      }
    }
  }

  const post = await Post.create({
    content: content || '',
    media: mediaUploads,
    author: authorId,
    visibility: visibility || 'public',
    hashtags: allHashtags,
    mentions: parsedMentions,
  });

  // Increment user post count
  await User.findByIdAndUpdate(authorId, { $inc: { postsCount: 1 } });

  // Send notifications to tagged users (mentions)
  if (parsedMentions && parsedMentions.length > 0) {
    parsedMentions.forEach((taggedUserId) => {
      notificationService.createNotification({
        type: 'tag',
        recipient: taggedUserId,
        actor: authorId,
        entity: post._id,
        entityModel: 'Post',
        message: 'tagged you in a post',
      }).catch((err) => console.error('Failed to send tag notification:', err.message));
    });
  }

  return post.populate([
    { path: 'author', select: 'name username avatar' },
    { path: 'mentions', select: 'name username' },
  ]);
}

export async function getFeed(userId, query) {
  const user = await User.findById(userId).select('friends following').lean();
  const feedUserIds = [userId, ...(user?.friends || []), ...(user?.following || [])];

  // Fetch groups joined by user
  const memberGroups = await GroupMember.find({ user: userId, isBlocked: false }).select('group').lean();
  const groupIds = (memberGroups || []).map((mg) => mg.group);

  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 20));

  // Determine pagination date from cursor
  let cursorDate = null;
  if (query.cursor) {
    const [pDoc, gpDoc] = await Promise.all([
      Post.findById(query.cursor).select('createdAt').lean(),
      GroupPost.findById(query.cursor).select('createdAt').lean(),
    ]);
    cursorDate = pDoc?.createdAt || gpDoc?.createdAt;
  }

  const timeFilter = cursorDate ? { createdAt: { $lt: cursorDate } } : {};

  const [posts, groupPosts, reels] = await Promise.all([
    Post.find({
      author: { $in: feedUserIds },
      visibility: { $in: ['public', 'friends'] },
      isDeleted: false,
      ...timeFilter,
    })
      .populate('author', 'name username avatar isOnline')
      .populate('mentions', 'name username')
      .populate(SHARED_POST_POPULATE)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean(),

    GroupPost.find({
      group: { $in: groupIds },
      isApproved: true,
      ...timeFilter,
    })
      .populate('author', 'name username avatar isOnline')
      .populate('group', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean(),

    Reel.find({
      visibility: 'public',
      isDeleted: false,
      ...timeFilter,
    })
      .populate('author', 'name username avatar isOnline')
      .populate('mentions', 'name username')
      .sort({ createdAt: -1 })
      .limit(Math.ceil(limit / 4) + 1)
      .lean(),
  ]);

  // Manually populate GroupPost media virtuals (lean bypasses virtuals)
  if (groupPosts.length > 0) {
    const gpIds = groupPosts.map((gp) => gp._id);
    const gpMedia = await GroupPostMedia.find({ post: { $in: gpIds } }).lean();
    const gpMediaMap = {};
    gpMedia.forEach((m) => {
      if (!gpMediaMap[m.post.toString()]) gpMediaMap[m.post.toString()] = [];
      gpMediaMap[m.post.toString()].push(m);
    });
    groupPosts.forEach((gp) => {
      gp.media = gpMediaMap[gp._id.toString()] || [];
    });
  }

  // 1. Alternate between normal posts and group posts
  const combined = [];
  let i = 0, j = 0;
  while (i < posts.length || j < groupPosts.length) {
    if (i < posts.length) combined.push(posts[i++]);
    if (j < groupPosts.length) combined.push(groupPosts[j++]);
  }

  // 2. Inject reels shelf at index 3 (only on first page load)
  const finalFeed = [];
  const showShelf = !query.cursor && reels.length > 0;

  if (combined.length === 0 && showShelf) {
    finalFeed.push({
      _id: 'reels_shelf_id',
      type: 'reels_shelf',
      reels,
    });
  } else {
    for (let idx = 0; idx < combined.length; idx++) {
      if (idx === 3 && showShelf) {
        finalFeed.push({
          _id: 'reels_shelf_id',
          type: 'reels_shelf',
          reels,
        });
      }
      finalFeed.push(combined[idx]);
    }
    if (combined.length < 3 && showShelf) {
      finalFeed.push({
        _id: 'reels_shelf_id',
        type: 'reels_shelf',
        reels,
      });
    }
  }

  const hasNextPage = finalFeed.length > limit;
  const data = hasNextPage ? finalFeed.slice(0, limit) : finalFeed;

  // Cursor must point to a real post/group-post item, not the reels_shelf
  let nextCursor = null;
  if (hasNextPage) {
    const lastRealItem = [...data].reverse().find((item) => item.type !== 'reels_shelf');
    nextCursor = lastRealItem?._id?.toString() || null;
  }

  // Attach current user's reaction to each item (including Reels in shelf)
  if (userId && data.length > 0) {
    const postIds = data.filter((item) => item.type !== 'reels_shelf').map((p) => p._id);
    const shelfItem = data.find((item) => item.type === 'reels_shelf');
    const shelfReels = shelfItem ? shelfItem.reels : [];
    const reelIds = shelfReels.map((r) => r._id);

    const [postReactions, reelReactions] = await Promise.all([
      Reaction.find({
        user: userId,
        target: { $in: postIds },
        targetModel: { $in: ['Post', 'GroupPost'] },
      }).lean(),
      Reaction.find({
        user: userId,
        target: { $in: reelIds },
        targetModel: 'Reel',
      }).lean(),
    ]);

    const reactionMap = {};
    postReactions.forEach((r) => { reactionMap[r.target.toString()] = r.type; });
    reelReactions.forEach((r) => { reactionMap[r.target.toString()] = r.type; });

    data.forEach((item) => {
      if (item.type !== 'reels_shelf') {
        item.userReaction = reactionMap[item._id.toString()] || null;
      }
    });

    shelfReels.forEach((reel) => {
      reel.userReaction = reactionMap[reel._id.toString()] || null;
    });
  }

  return { posts: data, nextCursor, hasNextPage };
}

/**
 * Gets a single post by ID.
 */
export async function getPostById(postId, currentUserId) {
  let post = await Post.findById(postId)
    .populate('author', 'name username avatar isOnline')
    .populate('mentions', 'name username')
    .populate(SHARED_POST_POPULATE)
    .lean();

  let isGroupPost = false;
  if (!post) {
    post = await GroupPost.findById(postId)
      .populate('author', 'name username avatar isOnline')
      .populate('group', 'name avatar')
      .lean();
    if (post) {
      isGroupPost = true;
      const gpMedia = await GroupPostMedia.find({ post: postId }).lean();
      post.media = gpMedia || [];
    }
  }

  if (!post) throw new NotFoundError('Post');

  let userReaction = null;
  if (currentUserId) {
    const reaction = await Reaction.findOne({
      user: currentUserId,
      target: postId,
      targetModel: isGroupPost ? 'GroupPost' : 'Post',
    });
    userReaction = reaction?.type || null;
  }

  return { ...post, userReaction };
}

/**
 * Updates a post.
 */
export async function updatePost(postId, userId, updates) {
  const post = await Post.findById(postId);
  if (!post) throw new NotFoundError('Post');
  if (post.author.toString() !== userId.toString()) throw new ForbiddenError('You can only edit your own posts');

  const { content, visibility } = updates;
  if (content !== undefined) post.content = content;
  if (visibility !== undefined) post.visibility = visibility;
  post.isEdited = true;

  // Re-extract hashtags
  const contentHashtags = post.content?.match(/#([a-zA-Z0-9_]+)/g)?.map((t) => t.slice(1).toLowerCase()) || [];
  post.hashtags = [...new Set(contentHashtags)];

  await post.save();
  return post.populate([
    { path: 'author', select: 'name username avatar' },
    { path: 'mentions', select: 'name username' },
  ]);
}

/**
 * Soft-deletes a post.
 */
export async function deletePost(postId, userId, userRole) {
  const post = await Post.findById(postId);
  if (!post) throw new NotFoundError('Post');

  const isOwner = post.author.toString() === userId.toString();
  const isAdmin = userRole === 'admin' || userRole === 'moderator';

  if (!isOwner && !isAdmin) throw new ForbiddenError('You can only delete your own posts');

  post.isDeleted = true;
  await post.save();

  // Delete media from Cloudinary
  if (post.media.length > 0) {
    Promise.all(
      post.media.map((m) => deleteFromCloudinary(m.publicId, m.type === 'video' ? 'video' : 'image'))
    ).catch((err) => console.error('Failed to delete media:', err.message));
  }

  if (isOwner) {
    await User.findByIdAndUpdate(userId, { $inc: { postsCount: -1 } });
  }
}

/**
 * Reacts to a post. If same reaction exists → remove it. If different → update it.
 */
export async function reactToPost(postId, userId, reactionType) {
  const post = await Post.findById(postId);
  if (!post) throw new NotFoundError('Post');

  const existing = await Reaction.findOne({ user: userId, target: postId, targetModel: 'Post' });

  if (existing) {
    if (existing.type === reactionType) {
      // Remove reaction (toggle off)
      await existing.deleteOne();
      await Post.findByIdAndUpdate(postId, {
        $inc: { [`reactionCounts.${reactionType}`]: -1, totalReactions: -1 },
      });
      return { action: 'removed', type: null };
    } else {
      // Change reaction type
      const oldType = existing.type;
      existing.type = reactionType;
      await existing.save();
      await Post.findByIdAndUpdate(postId, {
        $inc: {
          [`reactionCounts.${oldType}`]: -1,
          [`reactionCounts.${reactionType}`]: 1,
        },
      });
      return { action: 'updated', type: reactionType };
    }
  } else {
    // New reaction
    await Reaction.create({ type: reactionType, user: userId, target: postId, targetModel: 'Post' });
    await Post.findByIdAndUpdate(postId, {
      $inc: { [`reactionCounts.${reactionType}`]: 1, totalReactions: 1 },
    });

    // Notify post author (if not reacting to own post)
    if (post.author.toString() !== userId.toString()) {
      notificationService.createNotification({
        type: 'reaction',
        recipient: post.author,
        actor: userId,
        entity: postId,
        entityModel: 'Post',
        message: `reacted with ${reactionType} to your post`,
      }).catch(() => {});
    }

    return { action: 'added', type: reactionType };
  }
}

/**
 * Shares a post.
 */
export async function sharePost(postId, userId, content) {
  let originalPost = await Post.findById(postId);
  let sharedModel = 'Post';
  if (!originalPost) {
    originalPost = await Reel.findById(postId);
    sharedModel = 'Reel';
  }
  if (!originalPost) {
    originalPost = await GroupPost.findById(postId);
    sharedModel = 'GroupPost';
  }
  if (!originalPost) throw new NotFoundError('Post, Reel or GroupPost');

  const sharedPost = await Post.create({
    content: content || '',
    author: userId,
    sharedPost: postId,
    sharedModel: sharedModel,
    visibility: 'public', // Shared posts are public in feed
  });

  // Increment share count
  if (sharedModel === 'Post') {
    await Post.findByIdAndUpdate(postId, { $inc: { shareCount: 1 } });
  } else if (sharedModel === 'Reel') {
    await Reel.findByIdAndUpdate(postId, { $inc: { shareCount: 1 } });
  } else if (sharedModel === 'GroupPost') {
    await GroupPost.findByIdAndUpdate(postId, { $inc: { shareCount: 1 } });
  }

  // Notify original author
  if (originalPost.author.toString() !== userId.toString()) {
    notificationService.createNotification({
      type: 'share',
      recipient: originalPost.author,
      actor: userId,
      entity: sharedPost._id,
      entityModel: 'Post',
      message: sharedModel === 'Reel' 
        ? 'shared your reel' 
        : sharedModel === 'GroupPost' 
        ? 'shared your group post' 
        : 'shared your post',
    }).catch(() => {});
  }

  await User.findByIdAndUpdate(userId, { $inc: { postsCount: 1 } });

  return sharedPost.populate([
    { path: 'author', select: 'name username avatar' },
    SHARED_POST_POPULATE,
  ]);
}

/**
 * Saves/unsaves a post for a user.
 */
export async function toggleSavePost(postId, userId) {
  const existing = await SavedPost.findOne({ user: userId, post: postId });

  if (existing) {
    await existing.deleteOne();
    return { saved: false };
  } else {
    await SavedPost.create({ user: userId, post: postId });
    return { saved: true };
  }
}

/**
 * Reports a post.
 */
export async function reportPost(postId, userId, reason, description) {
  const post = await Post.findById(postId);
  if (!post) throw new NotFoundError('Post');

  try {
    await Report.create({ reporter: userId, target: postId, targetModel: 'Post', reason, description });
  } catch (err) {
    if (err.code === 11000) throw new ConflictError('You have already reported this post');
    throw err;
  }
}

/**
 * Gets saved posts for current user.
 */
export async function getSavedPosts(userId, paginationQuery) {
  const total = await SavedPost.countDocuments({ user: userId });
  const { skip, limit, meta } = paginate(paginationQuery, total);

  const saved = await SavedPost.find({ user: userId })
    .populate({
      path: 'post',
      populate: [
        { path: 'author', select: 'name username avatar' },
        { path: 'mentions', select: 'name username' },
        SHARED_POST_POPULATE,
      ],
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const posts = saved.map((s) => s.post).filter(Boolean);

  const reactionMap = {};
  if (userId) {
    const postIds = posts.map((p) => p._id);
    const reactions = await Reaction.find({ user: userId, target: { $in: postIds }, targetModel: 'Post' });
    reactions.forEach((r) => { reactionMap[r.target.toString()] = r.type; });
  }
  posts.forEach((post) => { post.userReaction = reactionMap[post._id.toString()] || null; });

  return { posts, meta };
}

/**
 * Gets posts by a specific user.
 */
export async function getUserPosts(username, currentUserId, paginationQuery) {
  const author = await User.findOne({ username: username.toLowerCase() }).lean();
  if (!author) throw new NotFoundError('User');

  const isFriend = author.friends?.some((id) => id.toString() === currentUserId?.toString());
  const isOwner = author._id.toString() === currentUserId?.toString();

  let visibilityFilter = ['public'];
  if (isOwner) visibilityFilter = ['public', 'friends', 'private'];
  else if (isFriend) visibilityFilter = ['public', 'friends'];

  const total = await Post.countDocuments({ author: author._id, visibility: { $in: visibilityFilter }, isDeleted: false });
  const { skip, limit, meta } = paginate(paginationQuery, total);

  const [posts, reels] = await Promise.all([
    Post.find({ author: author._id, visibility: { $in: visibilityFilter }, isDeleted: false })
      .populate('author', 'name username avatar')
      .populate('mentions', 'name username')
      .populate(SHARED_POST_POPULATE)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Reel.find({
      visibility: 'public',
      isDeleted: false,
    })
      .populate('author', 'name username avatar isOnline')
      .populate('mentions', 'name username')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  const finalPosts = [];
  const showShelf = skip === 0 && reels.length > 0;

  if (posts.length === 0 && showShelf) {
    finalPosts.push({
      _id: 'reels_shelf_id',
      type: 'reels_shelf',
      reels,
    });
  } else {
    for (let idx = 0; idx < posts.length; idx++) {
      if (idx === 3 && showShelf) {
        finalPosts.push({
          _id: 'reels_shelf_id',
          type: 'reels_shelf',
          reels,
        });
      }
      finalPosts.push(posts[idx]);
    }
    if (posts.length < 3 && showShelf && !finalPosts.some(p => p.type === 'reels_shelf')) {
      finalPosts.push({
        _id: 'reels_shelf_id',
        type: 'reels_shelf',
        reels,
      });
    }
  }

  if (currentUserId && finalPosts.length > 0) {
    const postIds = finalPosts.filter((item) => item.type !== 'reels_shelf').map((p) => p._id);
    const shelfItem = finalPosts.find((item) => item.type === 'reels_shelf');
    const shelfReels = shelfItem ? shelfItem.reels : [];
    const reelIds = shelfReels.map((r) => r._id);

    const [postReactions, reelReactions] = await Promise.all([
      Reaction.find({ user: currentUserId, target: { $in: postIds }, targetModel: 'Post' }),
      Reaction.find({ user: currentUserId, target: { $in: reelIds }, targetModel: 'Reel' }),
    ]);

    const reactionMap = {};
    postReactions.forEach((r) => { reactionMap[r.target.toString()] = r.type; });
    finalPosts.forEach((post) => {
      if (post.type !== 'reels_shelf') {
        post.userReaction = reactionMap[post._id.toString()] || null;
      }
    });

    const reelReactionMap = {};
    reelReactions.forEach((r) => { reelReactionMap[r.target.toString()] = r.type; });
    shelfReels.forEach((reel) => {
      reel.userReaction = reelReactionMap[reel._id.toString()] || null;
    });
  }

  return { posts: finalPosts, meta };
}

/**
 * Returns paginated reactions for a given post.
 */
export async function getPostReactions(postId, query) {
  let targetModel = 'Post';
  let post = await Post.findById(postId).select('_id').lean();

  if (!post) {
    post = await GroupPost.findById(postId).select('_id').lean();
    if (!post) throw new NotFoundError('Post');
    targetModel = 'GroupPost';
  }

  const filter = { target: postId, targetModel };
  if (query.type) filter.type = query.type;

  const total = await Reaction.countDocuments(filter);
  const { skip, limit, meta } = paginate(query, total);

  const reactions = await Reaction.find(filter)
    .populate('user', 'name username avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return { reactions, meta };
}
