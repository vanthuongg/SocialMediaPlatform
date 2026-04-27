import * as groupsService from './groups.service.js';
import { sendSuccess, sendPaginated } from '../../shared/utils/response.utils.js';

export async function createGroup(req, res, next) {
  try {
    const group = await groupsService.createGroup(req.user._id, req.body, req.files || {});
    sendSuccess(res, { data: { group }, message: 'Group created successfully', statusCode: 201 });
  } catch (err) { next(err); }
}

export async function getGroupsDashboard(req, res, next) {
  try {
    const data = await groupsService.getGroupsDashboard(req.user._id);
    sendSuccess(res, { data });
  } catch (err) { next(err); }
}

export async function searchGroups(req, res, next) {
  try {
    const groups = await groupsService.searchGroups(req.user?._id, req.query);
    sendSuccess(res, { data: { groups } });
  } catch (err) { next(err); }
}

export async function getGroup(req, res, next) {
  try {
    const group = await groupsService.getGroupById(req.params.groupId, req.user?._id);
    sendSuccess(res, { data: { group } });
  } catch (err) { next(err); }
}

export async function updateGroup(req, res, next) {
  try {
    const group = await groupsService.updateGroup(req.params.groupId, req.user._id, req.body, req.files || {});
    sendSuccess(res, { data: { group }, message: 'Group updated successfully' });
  } catch (err) { next(err); }
}

export async function deleteGroup(req, res, next) {
  try {
    await groupsService.deleteGroup(req.params.groupId, req.user._id);
    sendSuccess(res, { message: 'Group deleted successfully' });
  } catch (err) { next(err); }
}

// ── MEMBERSHIP CONTROLLERS ───────────────────────────────────────────────────

export async function joinGroup(req, res, next) {
  try {
    const result = await groupsService.joinGroup(req.params.groupId, req.user._id, req.body.answers || []);
    const message = result.status === 'joined' ? 'Joined group successfully' : 'Request to join group submitted';
    sendSuccess(res, { data: result, message });
  } catch (err) { next(err); }
}

export async function leaveGroup(req, res, next) {
  try {
    await groupsService.leaveGroup(req.params.groupId, req.user._id);
    sendSuccess(res, { message: 'Left group successfully' });
  } catch (err) { next(err); }
}

export async function inviteMember(req, res, next) {
  try {
    const invite = await groupsService.inviteMember(req.params.groupId, req.user._id, req.body.inviteeId);
    sendSuccess(res, { data: { invite }, message: 'Invitation sent' });
  } catch (err) { next(err); }
}

export async function respondToInvitation(req, res, next) {
  try {
    const result = await groupsService.respondToInvitation(req.params.invitationId, req.user._id, req.body.action);
    sendSuccess(res, { data: result, message: `Invitation ${req.body.action}ed` });
  } catch (err) { next(err); }
}

export async function listJoinRequests(req, res, next) {
  try {
    const requests = await groupsService.listJoinRequests(req.params.groupId);
    sendSuccess(res, { data: { requests } });
  } catch (err) { next(err); }
}

export async function respondToJoinRequest(req, res, next) {
  try {
    const result = await groupsService.respondToJoinRequest(req.params.groupId, req.params.requestId, req.user._id, req.body.action);
    sendSuccess(res, { data: result, message: `Join request ${req.body.action}ed` });
  } catch (err) { next(err); }
}

export async function listGroupMembers(req, res, next) {
  try {
    const { members, meta } = await groupsService.listGroupMembers(req.params.groupId, req.query);
    sendPaginated(res, members, meta);
  } catch (err) { next(err); }
}

export async function updateMemberRole(req, res, next) {
  try {
    const member = await groupsService.updateMemberRole(req.params.groupId, req.user._id, req.params.userId, req.body.role);
    sendSuccess(res, { data: { member }, message: 'Role updated successfully' });
  } catch (err) { next(err); }
}

export async function updateMemberStatus(req, res, next) {
  try {
    const member = await groupsService.updateMemberStatus(req.params.groupId, req.user._id, req.params.userId, req.body);
    sendSuccess(res, { data: { member }, message: 'Member status updated successfully' });
  } catch (err) { next(err); }
}

export async function kickMember(req, res, next) {
  try {
    await groupsService.kickMember(req.params.groupId, req.user._id, req.params.userId);
    sendSuccess(res, { message: 'Member kicked from group' });
  } catch (err) { next(err); }
}

// ── POST CONTROLLERS ─────────────────────────────────────────────────────────

export async function createGroupPost(req, res, next) {
  try {
    const post = await groupsService.createGroupPost(req.params.groupId, req.user._id, req.body.content, req.files || []);
    const message = post.isApproved ? 'Post created successfully' : 'Post submitted for review';
    sendSuccess(res, { data: { post }, message, statusCode: 201 });
  } catch (err) { next(err); }
}

export async function getGroupPosts(req, res, next) {
  try {
    const result = await groupsService.getGroupPosts(req.params.groupId, req.user?._id, req.query);
    sendSuccess(res, { data: result });
  } catch (err) { next(err); }
}

export async function getPendingPosts(req, res, next) {
  try {
    const posts = await groupsService.getPendingPosts(req.params.groupId);
    sendSuccess(res, { data: { posts } });
  } catch (err) { next(err); }
}

export async function approvePost(req, res, next) {
  try {
    const post = await groupsService.approvePost(req.params.groupId, req.params.postId, req.user._id);
    sendSuccess(res, { data: { post }, message: 'Post approved' });
  } catch (err) { next(err); }
}

export async function deleteGroupPost(req, res, next) {
  try {
    await groupsService.deleteGroupPost(req.params.groupId, req.params.postId, req.user._id);
    sendSuccess(res, { message: 'Post deleted successfully' });
  } catch (err) { next(err); }
}

export async function reactToGroupPost(req, res, next) {
  try {
    const result = await groupsService.reactToGroupPost(req.params.groupId, req.params.postId, req.user._id, req.body.type);
    sendSuccess(res, { data: result });
  } catch (err) { next(err); }
}

export async function pinGroupPost(req, res, next) {
  try {
    const post = await groupsService.pinGroupPost(req.params.groupId, req.params.postId, req.user._id);
    sendSuccess(res, { data: { post }, message: post.isPinned ? 'Post pinned' : 'Post unpinned' });
  } catch (err) { next(err); }
}

// ── RULES & REPORTS ──────────────────────────────────────────────────────────

export async function createRule(req, res, next) {
  try {
    const rule = await groupsService.createRule(req.params.groupId, req.body);
    sendSuccess(res, { data: { rule }, message: 'Rule created successfully' });
  } catch (err) { next(err); }
}

export async function deleteRule(req, res, next) {
  try {
    await groupsService.deleteRule(req.params.groupId, req.params.ruleId);
    sendSuccess(res, { message: 'Rule deleted successfully' });
  } catch (err) { next(err); }
}

export async function reportGroupItem(req, res, next) {
  try {
    const report = await groupsService.reportGroupItem(req.params.groupId, req.user._id, req.body);
    sendSuccess(res, { data: { report }, message: 'Report submitted successfully' });
  } catch (err) { next(err); }
}

export async function listReports(req, res, next) {
  try {
    const reports = await groupsService.listReports(req.params.groupId);
    sendSuccess(res, { data: { reports } });
  } catch (err) { next(err); }
}

export async function resolveReport(req, res, next) {
  try {
    const report = await groupsService.resolveReport(req.params.groupId, req.params.reportId, req.body.status);
    sendSuccess(res, { data: { report }, message: `Report marked as ${req.body.status}` });
  } catch (err) { next(err); }
}
