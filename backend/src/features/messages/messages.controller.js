import * as messagesService from './messages.service.js';
import { sendSuccess } from '../../shared/utils/response.utils.js';

export async function getConversations(req, res, next) {
  try {
    const conversations = await messagesService.getConversations(req.user._id);
    sendSuccess(res, { data: { conversations } });
  } catch (err) { next(err); }
}

export async function getOrCreateConversation(req, res, next) {
  try {
    const conversation = await messagesService.getOrCreateConversation(req.user._id, req.body.userId);
    sendSuccess(res, { data: { conversation } });
  } catch (err) { next(err); }
}

export async function getMessages(req, res, next) {
  try {
    const result = await messagesService.getMessages(req.params.id, req.user._id, req.query);
    sendSuccess(res, { data: result });
  } catch (err) { next(err); }
}

export async function sendMessage(req, res, next) {
  try {
    const message = await messagesService.sendMessage(req.params.id, req.user._id, req.body, req.file);
    sendSuccess(res, { data: { message }, statusCode: 201 });
  } catch (err) { next(err); }
}

export async function togglePinMessage(req, res, next) {
  try {
    const message = await messagesService.togglePinMessage(req.params.id, req.params.msgId, req.user._id);
    sendSuccess(res, { data: { message } });
  } catch (err) { next(err); }
}

export async function createGroupConversation(req, res, next) {
  try {
    const conversation = await messagesService.createGroupConversation(req.user._id, req.body);
    sendSuccess(res, { data: { conversation }, statusCode: 201 });
  } catch (err) { next(err); }
}

export async function deleteMessage(req, res, next) {
  try {
    await messagesService.deleteMessage(req.params.msgId, req.user._id);
    sendSuccess(res, { message: 'Message deleted' });
  } catch (err) { next(err); }
}
