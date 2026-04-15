import { Router } from 'express';
import * as postsController from './posts.controller.js';
import { authenticate, optionalAuthenticate } from '../../shared/middlewares/auth.middleware.js';
import { uploadMedia, handleUploadError } from '../../shared/middlewares/upload.middleware.js';

const router = Router();

router.get('/feed', authenticate, postsController.getFeed);
router.get('/saved', authenticate, postsController.getSavedPosts);
router.get('/user/:username', optionalAuthenticate, postsController.getUserPosts);

router.post('/', authenticate, uploadMedia.array('media', 10), handleUploadError, postsController.createPost);

router.get('/:id', optionalAuthenticate, postsController.getPost);
router.patch('/:id', authenticate, postsController.updatePost);
router.delete('/:id', authenticate, postsController.deletePost);

router.get('/:id/reactions', optionalAuthenticate, postsController.getPostReactions);
router.post('/:id/react', authenticate, postsController.reactToPost);
router.post('/:id/share', authenticate, postsController.sharePost);
router.post('/:id/save', authenticate, postsController.toggleSavePost);
router.post('/:id/report', authenticate, postsController.reportPost);

export default router;
