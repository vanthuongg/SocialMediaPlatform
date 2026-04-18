import * as commentsService from './comments.service.js';
import { sendSuccess, sendPaginated } from '../../shared/utils/response.utils.js';

export async function createComment(req, res, next) {
  try {
    const comment = await commentsService.createComment(req.params.postId, req.user._id, req.body);
    sendSuccess(res, { data: { comment }, statusCode: 201 });
  } catch (err) { next(err); }
}

export async function getPostComments(req, res, next) {
  try {
    const result = await commentsService.getPostComments(req.params.postId, req.query, req.user?._id);
    sendSuccess(res, { data: result });
  } catch (err) { next(err); }
}

export async function getCommentReplies(req, res, next) {
  try {
    const { replies, meta } = await commentsService.getCommentReplies(req.params.id, req.query, req.user?._id);
    sendPaginated(res, replies, meta);
  } catch (err) { next(err); }
}

export async function updateComment(req, res, next) {
  try {
    const comment = await commentsService.updateComment(req.params.id, req.user._id, req.body.content);
    sendSuccess(res, { data: { comment } });
  } catch (err) { next(err); }
}

export async function deleteComment(req, res, next) {
  try {
    await commentsService.deleteComment(req.params.id, req.user._id, req.user.role);
    sendSuccess(res, { message: 'Comment deleted' });
  } catch (err) { next(err); }
}

export async function reactToComment(req, res, next) {
  try {
    const result = await commentsService.reactToComment(req.params.id, req.user._id, req.body.type);
    sendSuccess(res, { data: result });
  } catch (err) { next(err); }
}
