import * as postsService from './posts.service.js';
import { sendSuccess, sendPaginated } from '../../shared/utils/response.utils.js';

export async function createPost(req, res, next) {
  try {
    const post = await postsService.createPost(req.user._id, req.body, req.files || []);
    sendSuccess(res, { data: { post }, message: 'Post created successfully', statusCode: 201 });
  } catch (err) { next(err); }
}

export async function getFeed(req, res, next) {
  try {
    const { posts, nextCursor, hasNextPage } = await postsService.getFeed(req.user._id, req.query);
    sendSuccess(res, { data: { posts, nextCursor, hasNextPage } });
  } catch (err) { next(err); }
}

export async function getPost(req, res, next) {
  try {
    const post = await postsService.getPostById(req.params.id, req.user?._id);
    sendSuccess(res, { data: { post } });
  } catch (err) { next(err); }
}

export async function updatePost(req, res, next) {
  try {
    const post = await postsService.updatePost(req.params.id, req.user._id, req.body);
    sendSuccess(res, { data: { post }, message: 'Post updated successfully' });
  } catch (err) { next(err); }
}

export async function deletePost(req, res, next) {
  try {
    await postsService.deletePost(req.params.id, req.user._id, req.user.role);
    sendSuccess(res, { message: 'Post deleted successfully' });
  } catch (err) { next(err); }
}

export async function reactToPost(req, res, next) {
  try {
    const result = await postsService.reactToPost(req.params.id, req.user._id, req.body.type);
    sendSuccess(res, { data: result });
  } catch (err) { next(err); }
}

export async function sharePost(req, res, next) {
  try {
    const post = await postsService.sharePost(req.params.id, req.user._id, req.body.content);
    sendSuccess(res, { data: { post }, statusCode: 201 });
  } catch (err) { next(err); }
}

export async function toggleSavePost(req, res, next) {
  try {
    const result = await postsService.toggleSavePost(req.params.id, req.user._id);
    sendSuccess(res, { data: result });
  } catch (err) { next(err); }
}

export async function reportPost(req, res, next) {
  try {
    await postsService.reportPost(req.params.id, req.user._id, req.body.reason, req.body.description);
    sendSuccess(res, { message: 'Report submitted. Thank you for keeping Nova safe.' });
  } catch (err) { next(err); }
}

export async function getSavedPosts(req, res, next) {
  try {
    const { posts, meta } = await postsService.getSavedPosts(req.user._id, req.query);
    sendPaginated(res, posts, meta);
  } catch (err) { next(err); }
}

export async function getUserPosts(req, res, next) {
  try {
    const { posts, meta } = await postsService.getUserPosts(req.params.username, req.user?._id, req.query);
    sendPaginated(res, posts, meta);
  } catch (err) { next(err); }
}

export async function getPostReactions(req, res, next) {
  try {
    const { reactions, meta } = await postsService.getPostReactions(req.params.id, req.query);
    sendPaginated(res, reactions, meta);
  } catch (err) { next(err); }
}
