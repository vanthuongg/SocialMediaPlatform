import { Router } from 'express';
import * as usersController from './users.controller.js';
import { authenticate, optionalAuthenticate } from '../../shared/middlewares/auth.middleware.js';
import { uploadImage, handleUploadError } from '../../shared/middlewares/upload.middleware.js';

const router = Router();

// Protected /me/* routes must come BEFORE /:username to avoid shadowing
router.use('/me', authenticate);
router.patch(
  '/me',
  uploadImage.fields([{ name: 'avatar', maxCount: 1 }, { name: 'cover', maxCount: 1 }]),
  handleUploadError,
  usersController.updateProfile
);
router.get('/me/friends', authenticate, usersController.getFriends);
router.get('/me/friend-requests', authenticate, usersController.getPendingFriendRequests);
router.get('/me/suggestions', authenticate, usersController.getSuggestions);
router.get('/me/blocked', authenticate, usersController.getBlockedUsers);

// Public profile route (must be after /me/* to avoid route conflict)
router.get('/:username', optionalAuthenticate, usersController.getProfile);

// Other protected routes
router.use(authenticate);

router.get('/:id/friends', usersController.getFriends);
router.get('/:id/followers', usersController.getFollowers);
router.get('/:id/following', usersController.getFollowing);

router.post('/:id/follow', usersController.followUser);
router.delete('/:id/follow', usersController.unfollowUser);
router.post('/:id/friend-request', usersController.sendFriendRequest);
router.post('/:id/block', usersController.blockUser);
router.delete('/:id/block', usersController.unblockUser);
router.patch('/friend-request/:requestId/:action', usersController.respondToFriendRequest);
// Shortcut routes for frontend (accepts userId instead of requestId)
router.patch('/:id/friend-request/accept', (req, res, next) => {
  req.params.action = 'accept';
  req.params.requestId = req.params.id;
  usersController.respondToFriendRequest(req, res, next);
});
router.patch('/:id/friend-request/decline', (req, res, next) => {
  req.params.action = 'decline';
  req.params.requestId = req.params.id;
  usersController.respondToFriendRequest(req, res, next);
});

export default router;
