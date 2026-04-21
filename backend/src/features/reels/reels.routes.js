import { Router } from 'express';
import * as reelsController from './reels.controller.js';
import { authenticate, optionalAuthenticate } from '../../shared/middlewares/auth.middleware.js';
import { uploadVideo, handleUploadError } from '../../shared/middlewares/upload.middleware.js';

const router = Router();

router.get('/', optionalAuthenticate, reelsController.getReelsFeed);
router.post('/', authenticate, uploadVideo.single('video'), handleUploadError, reelsController.createReel);
router.post('/:id/view', reelsController.viewReel);
router.delete('/:id', authenticate, reelsController.deleteReel);
router.post('/seed', authenticate, reelsController.seedReels);
router.post('/:id/react', authenticate, reelsController.reactToReel);
router.post('/:id/report', authenticate, reelsController.reportReel);

export default router;
