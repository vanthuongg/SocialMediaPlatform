import Reel from './reels.model.js';
import User from '../users/users.model.js';
import Reaction from '../posts/reaction.model.js';
import Report from '../posts/report.model.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../shared/errors/index.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../../shared/utils/cloudinary.utils.js';
import { cursorPaginate } from '../../shared/utils/pagination.utils.js';
import { createNotification } from '../notifications/notifications.service.js';

/**
 * Gets a paginated feed of public reels (TikTok-style scroll).
 */
export async function getReelsFeed(userId, query) {
  const { query: cursorQuery, limit } = cursorPaginate(query.cursor, query.limit || 10);

  const reels = await Reel.find({
    visibility: 'public',
    isDeleted: false,
    ...cursorQuery,
  })
    .populate('author', 'name username avatar isOnline')
    .populate('mentions', 'name username')
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .lean();

  const hasNextPage = reels.length > limit;
  const data = hasNextPage ? reels.slice(0, limit) : reels;
  
  const reactionMap = {};
  if (userId) {
    const reelIds = data.map((r) => r._id);
    const reactions = await Reaction.find({ user: userId, target: { $in: reelIds }, targetModel: 'Reel' });
    reactions.forEach((r) => { reactionMap[r.target.toString()] = r.type; });
  }
  data.forEach((reel) => { reel.userReaction = reactionMap[reel._id.toString()] || null; });

  const nextCursor = hasNextPage ? data[data.length - 1]._id : null;

  return { reels: data, nextCursor, hasNextPage };
}

/**
 * Creates a reel with video upload to Cloudinary.
 */
export async function createReel(authorId, file, data) {
  const result = await uploadToCloudinary(file.buffer, {
    folder: `nova/reels/${authorId}`,
    resource_type: 'video',
    eager: [{ format: 'jpg', transformation: [{ start_offset: '0' }] }], // Generate thumbnail
  });

  const hashtags = data.caption?.match(/#([a-zA-Z0-9_]+)/g)?.map((t) => t.slice(1).toLowerCase()) || [];

  // Parse mentions robustly
  const mentionMatches = data.caption?.match(/@([a-zA-Z0-9_]+)/g) || [];
  const usernames = mentionMatches.map((m) => m.slice(1).toLowerCase());
  let mentions = [];
  if (usernames.length > 0) {
    const users = await User.find({ username: { $in: usernames } }).select('_id');
    mentions = users.map((u) => u._id);
  }

  const reel = await Reel.create({
    author: authorId,
    video: {
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration,
      thumbnail: result.eager?.[0]?.secure_url || '',
    },
    caption: data.caption || '',
    hashtags,
    mentions,
    visibility: data.visibility || 'public',
  });

  return reel.populate([
    { path: 'author', select: 'name username avatar' },
    { path: 'mentions', select: 'name username' }
  ]);
}

/**
 * Increments view count for a reel.
 */
export async function viewReel(reelId) {
  await Reel.findByIdAndUpdate(reelId, { $inc: { viewCount: 1 } });
}

/**
 * Deletes a reel.
 */
export async function deleteReel(reelId, userId) {
  const reel = await Reel.findById(reelId);
  if (!reel) throw new NotFoundError('Reel');
  if (reel.author.toString() !== userId.toString()) throw new ForbiddenError('You can only delete your own reels');

  reel.isDeleted = true;
  await reel.save();

  if (reel.video?.publicId) {
    deleteFromCloudinary(reel.video.publicId, 'video').catch(() => {});
  }
}

const PREDEFINED_REELS = [
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&q=80&w=400',
    caption: 'Vibe check in the lights! 🕺 Custom choreography by @moderator #dance #nightlife #vibes',
    hashtags: ['dance', 'nightlife', 'vibes']
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=400',
    caption: 'Nothing beats early morning runs on the sand 🌊 cc @admin #fitness #beach #run',
    hashtags: ['fitness', 'beach', 'run']
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=400',
    caption: 'Retro vibes at the amusement park 🎡 @moderator check this out #bubblegum #retro #fun',
    hashtags: ['bubblegum', 'retro', 'fun']
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1564982752979-3f7bc974d29a?auto=format&fit=crop&q=80&w=400',
    caption: 'Landing the trick on the first try! 🛹 Shoutout to coach @admin #skate #skatepark #skatelife',
    hashtags: ['skate', 'skatepark', 'skatelife']
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=400',
    caption: 'Watching the tide roll in... Absolute peace 🌅 @admin @moderator #sunset #ocean #calm',
    hashtags: ['sunset', 'ocean', 'calm']
  }
];

export async function seedReels(userId) {
  // Delete old mixkit reels to ensure clean transition to googleapis/other real video URLs
  await Reel.deleteMany({ "video.url": { $regex: /mixkit\.co/ } });

  let users = await User.find({}).limit(5);
  if (users.length === 0) {
    const fallbackUser = userId ? await User.findById(userId) : null;
    if (fallbackUser) {
      users = [fallbackUser];
    } else {
      throw new Error('No users found to author the seeded reels');
    }
  }

  const seededReels = [];
  for (let i = 0; i < PREDEFINED_REELS.length; i++) {
    const predefined = PREDEFINED_REELS[i];
    const author = users[i % users.length];

    // Extract mentions from predefined caption
    const mentionMatches = predefined.caption?.match(/@([a-zA-Z0-9_]+)/g) || [];
    const usernames = mentionMatches.map((m) => m.slice(1).toLowerCase());
    let mentions = [];
    if (usernames.length > 0) {
      const mentionUsers = await User.find({ username: { $in: usernames } }).select('_id');
      mentions = mentionUsers.map((u) => u._id);
    }

    const reel = await Reel.create({
      author: author._id,
      video: {
        url: predefined.url,
        duration: 15,
        thumbnail: predefined.thumbnail,
      },
      caption: predefined.caption,
      hashtags: predefined.hashtags,
      mentions,
      visibility: 'public',
      totalReactions: Math.floor(Math.random() * 200) + 10,
      commentCount: Math.floor(Math.random() * 50) + 5,
    });
    seededReels.push(reel);
  }
  return seededReels;
}

export async function reactToReel(reelId, userId, reactionType) {
  const reel = await Reel.findById(reelId);
  if (!reel) throw new NotFoundError('Reel');

  const existing = await Reaction.findOne({ user: userId, target: reelId, targetModel: 'Reel' });

  if (existing) {
    if (existing.type === reactionType) {
      await existing.deleteOne();
      await Reel.findByIdAndUpdate(reelId, {
        $inc: { [`reactionCounts.${reactionType}`]: -1, totalReactions: -1 },
      });
      return { action: 'removed', type: null };
    } else {
      const oldType = existing.type;
      existing.type = reactionType;
      await existing.save();
      await Reel.findByIdAndUpdate(reelId, {
        $inc: {
          [`reactionCounts.${oldType}`]: -1,
          [`reactionCounts.${reactionType}`]: 1,
        },
      });
      return { action: 'updated', type: reactionType };
    }
  } else {
    await Reaction.create({ type: reactionType, user: userId, target: reelId, targetModel: 'Reel' });
    await Reel.findByIdAndUpdate(reelId, {
      $inc: { [`reactionCounts.${reactionType}`]: 1, totalReactions: 1 },
    });

    if (reel.author.toString() !== userId.toString()) {
      createNotification({
        type: 'reaction',
        recipient: reel.author,
        actor: userId,
        entity: reelId,
        entityModel: 'Reel',
        message: `reacted with ${reactionType} to your reel`,
      }).catch(() => {});
    }

    return { action: 'added', type: reactionType };
  }
}

/**
 * Reports a reel.
 */
export async function reportReel(reelId, userId, reason, description) {
  const reel = await Reel.findById(reelId);
  if (!reel) throw new NotFoundError('Reel');

  try {
    await Report.create({ reporter: userId, target: reelId, targetModel: 'Reel', reason, description });
  } catch (err) {
    if (err.code === 11000) throw new ConflictError('You have already reported this reel');
    throw err;
  }
}
