import * as reelsService from './reels.service.js';
import { sendSuccess } from '../../shared/utils/response.utils.js';

export async function getReelsFeed(req, res, next) {
  try {
    const result = await reelsService.getReelsFeed(req.user?._id, req.query);
    sendSuccess(res, { data: result });
  } catch (err) { next(err); }
}

export async function createReel(req, res, next) {
  try {
    if (!req.file) return next({ statusCode: 400, message: 'Video file is required', isOperational: true });
    const reel = await reelsService.createReel(req.user._id, req.file, req.body);
    sendSuccess(res, { data: { reel }, statusCode: 201 });
  } catch (err) { next(err); }
}

export async function viewReel(req, res, next) {
  try {
    await reelsService.viewReel(req.params.id);
    sendSuccess(res, { message: 'View recorded' });
  } catch (err) { next(err); }
}

export async function deleteReel(req, res, next) {
  try {
    await reelsService.deleteReel(req.params.id, req.user._id);
    sendSuccess(res, { message: 'Reel deleted' });
  } catch (err) { next(err); }
}

export async function seedReels(req, res, next) {
  try {
    const reels = await reelsService.seedReels(req.user?._id);
    sendSuccess(res, { data: { reels }, message: 'Random reels created successfully!' });
  } catch (err) { next(err); }
}

export async function reactToReel(req, res, next) {
  try {
    const { type } = req.body;
    const result = await reelsService.reactToReel(req.params.id, req.user._id, type || 'like');
    sendSuccess(res, { data: result });
  } catch (err) { next(err); }
}

export async function reportReel(req, res, next) {
  try {
    await reelsService.reportReel(req.params.id, req.user._id, req.body.reason, req.body.description);
    sendSuccess(res, { message: 'Reel reported. Thank you for keeping Nova safe.' });
  } catch (err) { next(err); }
}
