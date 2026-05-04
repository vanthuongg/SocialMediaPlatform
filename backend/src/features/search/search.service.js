import User from '../users/users.model.js';
import Post from '../posts/posts.model.js';
import { Group, GroupMember } from '../groups/groups.model.js';
import { paginate } from '../../shared/utils/pagination.utils.js';

/**
 * Global search across users, posts, and groups.
 */
export async function search(searchQuery, paginationQuery) {
  const { page, limit } = paginationQuery;
  const safeQuery = searchQuery.trim();

  if (!safeQuery) return { users: [], posts: [], groups: [], total: 0 };

  const [users, posts, groups] = await Promise.all([
    User.find({
      $or: [
        { name: { $regex: safeQuery, $options: 'i' } },
        { username: { $regex: safeQuery, $options: 'i' } },
        { bio: { $regex: safeQuery, $options: 'i' } },
      ],
    })
      .select('name username avatar bio followersCount friendsCount')
      .limit(10)
      .lean(),

    Post.find({
      $or: [
        { content: { $regex: safeQuery, $options: 'i' } },
        { hashtags: { $regex: safeQuery, $options: 'i' } },
      ],
      visibility: 'public',
    })
      .populate('author', 'name username avatar')
      .populate('mentions', 'name username')
      .populate({
        path: 'sharedPost',
        select: 'content media author caption video sharedModel createdAt',
        populate: {
          path: 'author',
          select: 'name username avatar',
        },
      })
      .sort({ totalReactions: -1, createdAt: -1 })
      .limit(10)
      .lean(),

    Group.find({
      $or: [
        { name: { $regex: safeQuery, $options: 'i' } },
        { description: { $regex: safeQuery, $options: 'i' } },
        { tags: { $regex: safeQuery, $options: 'i' } },
      ],
      visibility: 'visible',
    })
      .select('name description avatar cover category privacy visibility tags creator')
      .limit(10)
      .lean(),
  ]);

  let groupsWithMembers = [];
  if (groups.length > 0) {
    const groupIds = groups.map((g) => g._id);
    const memberAgg = await GroupMember.aggregate([
      { $match: { group: { $in: groupIds } } },
      { $group: { _id: '$group', count: { $sum: 1 } } },
    ]);
    const memberCounts = Object.fromEntries(
      memberAgg.map((d) => [d._id.toString(), d.count])
    );
    groupsWithMembers = groups.map((g) => ({
      ...g,
      membersCount: memberCounts[g._id.toString()] || 0,
    }));
  }

  return { users, posts, groups: groupsWithMembers };
}

/**
 * Search only posts by hashtag.
 */
export async function searchByHashtag(hashtag, paginationQuery) {
  const tag = hashtag.replace('#', '').toLowerCase();
  const total = await Post.countDocuments({ hashtags: tag, visibility: 'public' });
  const { skip, limit, meta } = paginate(paginationQuery, total);

  const posts = await Post.find({ hashtags: tag, visibility: 'public' })
    .populate('author', 'name username avatar')
    .populate('mentions', 'name username')
    .populate({
      path: 'sharedPost',
      select: 'content media author caption video sharedModel createdAt',
      populate: {
        path: 'author',
        select: 'name username avatar',
      },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return { posts, meta, hashtag: tag };
}
