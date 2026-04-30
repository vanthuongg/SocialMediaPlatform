import { Router } from 'express';
import * as storiesController from './stories.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { uploadMedia, handleUploadError } from '../../shared/middlewares/upload.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/', storiesController.getStories);
router.post('/', uploadMedia.single('media'), handleUploadError, storiesController.createStory);
router.post('/:id/view', storiesController.viewStory);
router.delete('/:id', storiesController.deleteStory);

// Reactions
router.post('/:id/react', storiesController.reactToStory);

// Comments
router.post('/:id/comments', storiesController.commentOnStory);
router.delete('/:id/comments/:commentId', storiesController.deleteComment);

export default router;
