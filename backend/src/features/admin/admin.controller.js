// [auto] Admin analytics and moderation handlers
import * as adminService from './admin.service.js';
import { sendSuccess, sendPaginated } from '../../shared/utils/response.utils.js';

// ── Shared (admin + moderator) ────────────────────────────────────────────────

export async function getDashboard(req, res, next) {
  try {
    const stats = await adminService.getDashboardStats();
    sendSuccess(res, { data: { stats } });
  } catch (err) { next(err); }
}

export async function getUsers(req, res, next) {
  try {
    const { users, meta } = await adminService.getUsers(req.query);
    sendPaginated(res, users, meta);
  } catch (err) { next(err); }
}

export async function banUser(req, res, next) {
  try {
    const { isBanned, banReason, durationDays } = req.body;
    const user = await adminService.banUser(req.params.id, isBanned, req.user._id, banReason, durationDays);
    sendSuccess(res, { data: { user }, message: `User ${isBanned ? 'banned' : 'unbanned'} successfully` });
  } catch (err) { next(err); }
}

export async function warnUser(req, res, next) {
  try {
    const warnings = await adminService.warnUser(req.params.id, req.user._id, req.body.reason);
    sendSuccess(res, { data: { warnings }, message: 'User warned successfully' });
  } catch (err) { next(err); }
}

export async function getReports(req, res, next) {
  try {
    const { reports, meta } = await adminService.getReports(req.query);
    sendPaginated(res, reports, meta);
  } catch (err) { next(err); }
}

export async function reviewReport(req, res, next) {
  try {
    const report = await adminService.reviewReport(req.params.id, req.user._id, req.body.action, req.body.actionTaken);
    sendSuccess(res, { data: { report } });
  } catch (err) { next(err); }
}

export async function deletePost(req, res, next) {
  try {
    await adminService.deletePost(req.params.id);
    sendSuccess(res, { message: 'Post removed by admin' });
  } catch (err) { next(err); }
}

export async function getPosts(req, res, next) {
  try {
    const { posts, meta } = await adminService.getPosts(req.query);
    sendPaginated(res, posts, meta);
  } catch (err) { next(err); }
}

// ── Admin-only ────────────────────────────────────────────────────────────────

export async function getAnalytics(req, res, next) {
  try {
    const data = await adminService.getAnalytics();
    sendSuccess(res, { data: { analytics: data } });
  } catch (err) { next(err); }
}

export async function changeUserRole(req, res, next) {
  try {
    const user = await adminService.changeUserRole(req.params.id, req.body.role);
    sendSuccess(res, { data: { user }, message: 'User role updated' });
  } catch (err) { next(err); }
}

export async function deleteUser(req, res, next) {
  try {
    await adminService.deleteUser(req.params.id, req.user._id);
    sendSuccess(res, { message: 'User permanently deleted' });
  } catch (err) { next(err); }
}

export async function createAccount(req, res, next) {
  try {
    const user = await adminService.createAccount(req.body);
    sendSuccess(res, { data: { user }, message: 'Account created successfully', statusCode: 201 });
  } catch (err) { next(err); }
}

export async function getReels(req, res, next) {
  try {
    const { reels, meta } = await adminService.getReels(req.query);
    sendPaginated(res, reels, meta);
  } catch (err) { next(err); }
}

export async function deleteReel(req, res, next) {
  try {
    await adminService.deleteReel(req.params.id);
    sendSuccess(res, { message: 'Reel removed by admin' });
  } catch (err) { next(err); }
}

export async function getGroups(req, res, next) {
  try {
    const { groups, meta } = await adminService.getGroups(req.query);
    sendPaginated(res, groups, meta);
  } catch (err) { next(err); }
}

export async function banGroup(req, res, next) {
  try {
    const { isBanned, banReason } = req.body;
    const group = await adminService.banGroup(req.params.id, isBanned, banReason);
    sendSuccess(res, { data: { group }, message: `Group ${isBanned ? 'banned' : 'unbanned'} successfully` });
  } catch (err) { next(err); }
}
