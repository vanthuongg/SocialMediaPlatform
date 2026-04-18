import Comment from './comments.model.js';
import Post from '../posts/posts.model.js';
import Reel from '../reels/reels.model.js';
import { GroupPost } from '../groups/groups.model.js';
import Reaction from '../posts/reaction.model.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors/index.js';
import { cursorPaginate, paginate } from '../../shared/utils/pagination.utils.js';
import * as notificationService from '../notifications/notifications.service.js';

/**
 * Decrement commentCount on the correct target model.
 */
async function decrementCommentCount(postId, postModel) {
  if (postModel === 'Reel') {
    await Reel.findByIdAndUpdate(postId, { $inc: { commentCount: -1 } });
  } else if (postModel === 'GroupPost') {
    await GroupPost.findByIdAndUpdate(postId, { $inc: { commentCount: -1 } });
  } else {
    await Post.findByIdAndUpdate(postId, { $inc: { commentCount: -1 } });
  }
}

/**
 * Creates a comment or reply on a post or reel.
 */
export async function createComment(postId, authorId, data) {
  let target = await Post.findById(postId);
  let targetModel = 'Post';
  if (!target) {
    target = await Reel.findById(postId);
    targetModel = 'Reel';
  }
  if (!target) {
    target = await GroupPost.findById(postId);
    targetModel = 'GroupPost';
  }
  if (!target) throw new NotFoundError('Post, Reel or GroupPost');

  if (data.parentComment) {
    const parent = await Comment.findById(data.parentComment);
    if (!parent) throw new NotFoundError('Parent comment');
    // Update reply count on parent
    await Comment.findByIdAndUpdate(data.parentComment, { $inc: { replyCount: 1 } });
  }

  const comment = await Comment.create({
    content: data.content,
    author: authorId,
    post: postId,
    postModel: targetModel,
    parentComment: data.parentComment || null,
    mentions: data.mentions || [],
  });

  // Update comment count
  if (targetModel === 'Reel') {
    await Reel.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });
  } else if (targetModel === 'Post') {
    await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });
  } else if (targetModel === 'GroupPost') {
    await GroupPost.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });
  }

  // Notify post/reel/group-post author
  if (target.author.toString() !== authorId.toString()) {
    notificationService.createNotification({
      type: 'comment',
      recipient: target.author,
      actor: authorId,
      entity: postId,
      entityModel: targetModel,
      message: targetModel === 'Reel'
        ? 'commented on your reel'
        : targetModel === 'GroupPost'
        ? 'commented on your group post'
        : 'commented on your post',
    }).catch(() => {});
  }

  // Notify comment author when this is a reply (and they're not the post author or self)
  if (data.parentComment) {
    const parentComment = await Comment.findById(data.parentComment).select('author').lean();
    const parentAuthorId = parentComment?.author?.toString();
    if (
      parentAuthorId &&
      parentAuthorId !== authorId.toString() &&
      parentAuthorId !== target.author.toString()
    ) {
      notificationService.createNotification({
        type: 'comment',
        recipient: parentAuthorId,
        actor: authorId,
        entity: postId,
        entityModel: targetModel,
        message: 'replied to your comment',
      }).catch(() => {});
    }
  }

  return comment.populate('author', 'name username avatar');
}

/**
 * Gets top-level comments for a post or reel with cursor pagination.
 */
export async function getPostComments(postId, query, userId) {
  const target = (await Post.findById(postId)) || (await Reel.findById(postId)) || (await GroupPost.findById(postId));
  if (!target) throw new NotFoundError('Post, Reel or GroupPost');

  const { query: cursorQuery, limit } = cursorPaginate(query.cursor, query.limit || 20);

  const comments = await Comment.find({
    post: postId,
    parentComment: null,
    isDeleted: false,
    ...cursorQuery,
  })
    .populate('author', 'name username avatar')
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .lean();

  const hasNextPage = comments.length > limit;
  const data = hasNextPage ? comments.slice(0, limit) : comments;
  const nextCursor = hasNextPage ? data[data.length - 1]._id : null;

  if (userId) {
    const commentIds = data.map((c) => c._id);
    const userReactions = await Reaction.find({
      user: userId,
      target: { $in: commentIds },
      targetModel: 'Comment',
    }).lean();

    const reactionMap = new Map(userReactions.map((r) => [r.target.toString(), r.type]));
    data.forEach((c) => {
      c.userReaction = reactionMap.get(c._id.toString()) || null;
      c.isLiked = !!c.userReaction;
    });
  }

  return { comments: data, nextCursor, hasNextPage };
}

/**
 * Gets replies for a specific comment.
 */
export async function getCommentReplies(commentId, paginationQuery, userId) {
  const total = await Comment.countDocuments({ parentComment: commentId, isDeleted: false });
  const { skip, limit, meta } = paginate(paginationQuery, total);

  const replies = await Comment.find({ parentComment: commentId, isDeleted: false })
    .populate('author', 'name username avatar')
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

  if (userId) {
    const replyIds = replies.map((r) => r._id);
    const userReactions = await Reaction.find({
      user: userId,
      target: { $in: replyIds },
      targetModel: 'Comment',
    }).lean();

    const reactionMap = new Map(userReactions.map((r) => [r.target.toString(), r.type]));
    replies.forEach((r) => {
      r.userReaction = reactionMap.get(r._id.toString()) || null;
      r.isLiked = !!r.userReaction;
    });
  }

  return { replies, meta };
}

/**
 * Updates a comment.
 */
export async function updateComment(commentId, userId, content) {
  const comment = await Comment.findById(commentId);
  if (!comment) throw new NotFoundError('Comment');
  if (comment.author.toString() !== userId.toString()) throw new ForbiddenError('You can only edit your own comments');

  comment.content = content;
  comment.isEdited = true;
  await comment.save();

  return comment.populate('author', 'name username avatar');
}

/**
 * Soft-deletes a comment.
 */
export async function deleteComment(commentId, userId, userRole) {
  const comment = await Comment.findById(commentId);
  if (!comment) throw new NotFoundError('Comment');

  const isOwner = comment.author.toString() === userId.toString();
  const isAdmin = userRole === 'admin' || userRole === 'moderator';

  if (!isOwner && !isAdmin) throw new ForbiddenError('You can only delete your own comments');

  comment.isDeleted = true;
  comment.content = '[This comment has been deleted]';
  await comment.save();

  // Decrement commentCount on the correct model
  await decrementCommentCount(comment.post, comment.postModel);

  if (comment.parentComment) {
    await Comment.findByIdAndUpdate(comment.parentComment, { $inc: { replyCount: -1 } });
  }
}

/**
 * Reacts to a comment.
 */
export async function reactToComment(commentId, userId, reactionType) {
  const comment = await Comment.findById(commentId);
  if (!comment) throw new NotFoundError('Comment');

  const existing = await Reaction.findOne({ user: userId, target: commentId, targetModel: 'Comment' });

  if (existing) {
    if (existing.type === reactionType) {
      await existing.deleteOne();
      await Comment.findByIdAndUpdate(commentId, {
        $inc: { [`reactionCounts.${reactionType}`]: -1, totalReactions: -1 },
      });
      return { action: 'removed', type: null };
    } else {
      const oldType = existing.type;
      existing.type = reactionType;
      await existing.save();
      await Comment.findByIdAndUpdate(commentId, {
        $inc: { [`reactionCounts.${oldType}`]: -1, [`reactionCounts.${reactionType}`]: 1 },
      });
      return { action: 'updated', type: reactionType };
    }
  } else {
    await Reaction.create({ type: reactionType, user: userId, target: commentId, targetModel: 'Comment' });
    await Comment.findByIdAndUpdate(commentId, {
      $inc: { [`reactionCounts.${reactionType}`]: 1, totalReactions: 1 },
    });
    return { action: 'added', type: reactionType };
  }
}
