import * as storiesService from './stories.service.js';
import { sendSuccess } from '../../shared/utils/response.utils.js';

export async function getStories(req, res, next) {
  try {
    const stories = await storiesService.getStories(req.user._id);
    sendSuccess(res, { data: { stories } });
  } catch (err) { next(err); }
}

export async function createStory(req, res, next) {
  try {
    if (!req.file) return next({ statusCode: 400, message: 'Media file is required', isOperational: true });
    const story = await storiesService.createStory(req.user._id, req.file, req.body);
    sendSuccess(res, { data: { story }, statusCode: 201 });
  } catch (err) { next(err); }
}

export async function viewStory(req, res, next) {
  try {
    await storiesService.viewStory(req.params.id, req.user._id);
    sendSuccess(res, { message: 'Story viewed' });
  } catch (err) { next(err); }
}

export async function deleteStory(req, res, next) {
  try {
    await storiesService.deleteStory(req.params.id, req.user._id);
    sendSuccess(res, { message: 'Story deleted' });
  } catch (err) { next(err); }
}

export async function reactToStory(req, res, next) {
  try {
    const { emoji } = req.body;
    if (!emoji) return next({ statusCode: 400, message: 'emoji is required', isOperational: true });
    const reactions = await storiesService.reactToStory(req.params.id, req.user._id, emoji);
    sendSuccess(res, { data: { reactions } });
  } catch (err) { next(err); }
}

export async function commentOnStory(req, res, next) {
  try {
    const { text } = req.body;
    if (!text?.trim()) return next({ statusCode: 400, message: 'text is required', isOperational: true });
    const comments = await storiesService.commentOnStory(req.params.id, req.user._id, text.trim());
    sendSuccess(res, { data: { comments }, statusCode: 201 });
  } catch (err) { next(err); }
}

export async function deleteComment(req, res, next) {
  try {
    await storiesService.deleteComment(req.params.id, req.params.commentId, req.user._id);
    sendSuccess(res, { message: 'Comment deleted' });
  } catch (err) { next(err); }
}
