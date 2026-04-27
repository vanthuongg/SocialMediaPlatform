import { Group, GroupMember } from './groups.model.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors/index.js';

/**
 * Middleware to check group membership.
 * If the group is public, anyone can view, but req.groupMember is attached if they are a member.
 * If the group is private, the user must be a member (or global admin/moderator).
 */
export async function requireMembership(req, res, next) {
  try {
    const groupId = req.params.groupId;
    const group = await Group.findById(groupId);
    if (!group) throw new NotFoundError('Group');

    const member = await GroupMember.findOne({ group: groupId, user: req.user._id });
    if (member && member.isBlocked) {
      throw new ForbiddenError('You have been banned from this group');
    }
    const isGlobalAdmin = ['admin', 'moderator'].includes(req.user.role);

    if (group.privacy === 'private' && !member && !isGlobalAdmin) {
      throw new ForbiddenError('You must be a member of this group to view its content');
    }

    req.group = group;
    req.groupMember = member;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware to restrict action to specific group roles (e.g., owner, admin, moderator).
 * Global admins/moderators automatically pass.
 */
export function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      const groupId = req.params.groupId;
      const isGlobalAdmin = ['admin', 'moderator'].includes(req.user.role);
      if (isGlobalAdmin) {
        return next();
      }

      const member = await GroupMember.findOne({ group: groupId, user: req.user._id });
      if (!member || member.isBlocked || !roles.includes(member.role)) {
        throw new ForbiddenError('You do not have permission to perform this action');
      }

      req.groupMember = member;
      next();
    } catch (err) {
      next(err);
    }
  };
}
