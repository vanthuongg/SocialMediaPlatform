import Story from './stories.model.js';
import User from '../users/users.model.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors/index.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../../shared/utils/cloudinary.utils.js';

/**
 * Gets active stories from followed users + friends + self.
 * Groups by author for story rings display.
 */
export async function getStories(userId) {
  const user = await User.findById(userId).select('friends following').lean();
  const feedUserIds = [userId, ...(user.friends || []), ...(user.following || [])];

  const stories = await Story.find({
    author: { $in: feedUserIds },
    expiresAt: { $gt: new Date() },
  })
    .populate('author', 'name username avatar')
    .populate('comments.author', 'name username avatar')
    .sort({ createdAt: 1 })
    .lean();

  // Group stories by author
  const grouped = {};
  stories.forEach((story) => {
    const authorId = story.author._id.toString();
    if (!grouped[authorId]) {
      grouped[authorId] = {
        author: story.author,
        stories: [],
        hasUnviewed: false,
      };
    }
    const hasViewed = story.viewers.some((v) => v.user.toString() === userId.toString());
    if (!hasViewed) grouped[authorId].hasUnviewed = true;
    grouped[authorId].stories.push({ ...story, hasViewed });
  });

  return Object.values(grouped);
}

/**
 * Creates a new story with media upload.
 */
export async function createStory(authorId, file, data) {
  const isVideo = file.mimetype.startsWith('video/');
  const result = await uploadToCloudinary(file.buffer, {
    folder: `nova/stories/${authorId}`,
    resource_type: isVideo ? 'video' : 'image',
  });

  const story = await Story.create({
    author: authorId,
    media: {
      url: result.secure_url,
      publicId: result.public_id,
      type: isVideo ? 'video' : 'image',
      duration: result.duration,
    },
    caption: data.caption,
    backgroundColor: data.backgroundColor,
  });

  return story.populate('author', 'name username avatar');
}

/**
 * Marks a story as viewed by the current user.
 */
export async function viewStory(storyId, userId) {
  const story = await Story.findById(storyId);
  if (!story) throw new NotFoundError('Story');

  const alreadyViewed = story.viewers.some((v) => v.user.toString() === userId.toString());
  if (!alreadyViewed) {
    story.viewers.push({ user: userId });
    story.viewCount += 1;
    await story.save();
  }
}

/**
 * Deletes a story and its Cloudinary asset.
 */
export async function deleteStory(storyId, userId) {
  const story = await Story.findById(storyId);
  if (!story) throw new NotFoundError('Story');
  if (story.author.toString() !== userId.toString()) throw new ForbiddenError('You can only delete your own stories');

  if (story.media?.publicId) {
    await deleteFromCloudinary(story.media.publicId, story.media.type === 'video' ? 'video' : 'image').catch(() => {});
  }

  await story.deleteOne();
}

/**
 * Toggle / update a reaction (emoji) on a story.
 * - If user has no reaction → add it.
 * - If user reacts with same emoji → remove it (toggle off).
 * - If user reacts with different emoji → update it.
 */
export async function reactToStory(storyId, userId, emoji) {
  const story = await Story.findById(storyId);
  if (!story) throw new NotFoundError('Story');

  const existing = story.reactions.find((r) => r.user.toString() === userId.toString());
  if (existing) {
    if (existing.emoji === emoji) {
      // Toggle off
      story.reactions = story.reactions.filter((r) => r.user.toString() !== userId.toString());
    } else {
      existing.emoji = emoji;
    }
  } else {
    story.reactions.push({ user: userId, emoji });
  }

  await story.save();
  return story.reactions;
}

/**
 * Add a comment to a story.
 */
export async function commentOnStory(storyId, userId, text) {
  const story = await Story.findById(storyId);
  if (!story) throw new NotFoundError('Story');

  story.comments.push({ author: userId, text });
  await story.save();

  // Re-fetch to get populated author on new comment
  const updated = await Story.findById(storyId)
    .select('comments')
    .populate('comments.author', 'name username avatar')
    .lean();

  return updated.comments;
}

/**
 * Delete a comment from a story.
 */
export async function deleteComment(storyId, commentId, userId) {
  const story = await Story.findById(storyId);
  if (!story) throw new NotFoundError('Story');

  const comment = story.comments.id(commentId);
  if (!comment) throw new NotFoundError('Comment');
  if (comment.author.toString() !== userId.toString() && story.author.toString() !== userId.toString()) {
    throw new ForbiddenError('Not allowed to delete this comment');
  }

  comment.deleteOne();
  await story.save();
}
