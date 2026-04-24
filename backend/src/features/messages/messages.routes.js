import { Router } from 'express';
import * as messagesController from './messages.controller.js';
import { authenticate } from '../../shared/middlewares/auth.middleware.js';
import { uploadMedia, handleUploadError } from '../../shared/middlewares/upload.middleware.js';

const router = Router();
router.use(authenticate);

router.get('/conversations', messagesController.getConversations);
router.post('/conversations', messagesController.getOrCreateConversation);
router.post('/conversations/group', messagesController.createGroupConversation);
router.get('/conversations/:id', messagesController.getMessages);
router.post('/conversations/:id/messages', uploadMedia.single('media'), handleUploadError, messagesController.sendMessage);
router.delete('/conversations/:id/messages/:msgId', messagesController.deleteMessage);
router.patch('/conversations/:id/messages/:msgId/pin', messagesController.togglePinMessage);

export default router;
