import { Router } from 'express';
import * as commentsController from './comments.controller.js';
import { authenticate, optionalAuthenticate } from '../../shared/middlewares/auth.middleware.js';

const router = Router({ mergeParams: true });

// Mounted under /api/v1/posts/:postId/comments (mergeParams for postId)
router.get('/', optionalAuthenticate, commentsController.getPostComments);
router.post('/', authenticate, commentsController.createComment);

// Standalone comment operations — also accessed via /api/v1/comments/:id
router.get('/:id/replies', optionalAuthenticate, commentsController.getCommentReplies);
router.patch('/:id', authenticate, commentsController.updateComment);
router.delete('/:id', authenticate, commentsController.deleteComment);
router.post('/:id/react', authenticate, commentsController.reactToComment);

export default router;
