import express from 'express';
import * as groupsController from './groups.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { requireMembership, requireRole } from './groups.middleware.js';
import { uploadMedia, handleUploadError } from '../../shared/middlewares/upload.middleware.js';

const router = express.Router();

// All group routes require authentication
router.use(authenticate);

// 1. Group CRUD & Dashboard & Search
router.post(
  '/',
  uploadMedia.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  handleUploadError,
  groupsController.createGroup
);
router.get('/', groupsController.getGroupsDashboard);
router.get('/search', groupsController.searchGroups);

// 2. Respond to Invitation
router.post('/invitations/:invitationId/respond', groupsController.respondToInvitation);

// 3. Group Detail
router.get('/:groupId', groupsController.getGroup);
router.put(
  '/:groupId',
  requireRole('owner', 'admin'),
  uploadMedia.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  handleUploadError,
  groupsController.updateGroup
);
router.delete('/:groupId', requireRole('owner'), groupsController.deleteGroup);

// 4. Members management
router.post('/:groupId/join', groupsController.joinGroup);
router.post('/:groupId/leave', requireMembership, groupsController.leaveGroup);
router.post('/:groupId/invite', requireMembership, groupsController.inviteMember);

// Moderator/Admin Join Requests
router.get('/:groupId/requests', requireRole('owner', 'admin', 'moderator'), groupsController.listJoinRequests);
router.post('/:groupId/requests/:requestId/respond', requireRole('owner', 'admin', 'moderator'), groupsController.respondToJoinRequest);

// List members, update roles, and kick
router.get('/:groupId/members', requireMembership, groupsController.listGroupMembers);
router.patch('/:groupId/members/:userId/role', requireRole('owner', 'admin'), groupsController.updateMemberRole);
router.patch('/:groupId/members/:userId/status', requireRole('owner', 'admin', 'moderator'), groupsController.updateMemberStatus);
router.delete('/:groupId/members/:userId', requireRole('owner', 'admin', 'moderator'), groupsController.kickMember);

// 5. Group Posts & Interaction
router.post(
  '/:groupId/posts',
  requireMembership,
  uploadMedia.array('media', 10),
  handleUploadError,
  groupsController.createGroupPost
);
router.get('/:groupId/posts', requireMembership, groupsController.getGroupPosts);
router.get('/:groupId/posts/pending', requireRole('owner', 'admin', 'moderator'), groupsController.getPendingPosts);
router.patch('/:groupId/posts/:postId/approve', requireRole('owner', 'admin', 'moderator'), groupsController.approvePost);
router.delete('/:groupId/posts/:postId', requireMembership, groupsController.deleteGroupPost);
router.post('/:groupId/posts/:postId/react', requireMembership, groupsController.reactToGroupPost);
router.post('/:groupId/posts/:postId/pin', requireRole('owner', 'admin', 'moderator'), groupsController.pinGroupPost);

// 6. Rules & Moderation Reports
router.post('/:groupId/rules', requireRole('owner', 'admin'), groupsController.createRule);
router.delete('/:groupId/rules/:ruleId', requireRole('owner', 'admin'), groupsController.deleteRule);

router.post('/:groupId/reports', requireMembership, groupsController.reportGroupItem);
router.get('/:groupId/reports', requireRole('owner', 'admin', 'moderator'), groupsController.listReports);
router.patch('/:groupId/reports/:reportId/resolve', requireRole('owner', 'admin', 'moderator'), groupsController.resolveReport);

export default router;
