import * as usersService from './users.service.js';
import { sendSuccess, sendPaginated } from '../../shared/utils/response.utils.js';

export async function getProfile(req, res, next) {
  try {
    const user = await usersService.getUserProfile(req.params.username, req.user?._id);
    sendSuccess(res, { data: { user } });
  } catch (err) { next(err); }
}

export async function updateProfile(req, res, next) {
  try {
    const user = await usersService.updateProfile(req.user._id, req.body, req.files);
    sendSuccess(res, { data: { user }, message: 'Profile updated successfully' });
  } catch (err) { next(err); }
}

export async function followUser(req, res, next) {
  try {
    await usersService.followUser(req.user._id, req.params.id);
    sendSuccess(res, { message: 'User followed successfully' });
  } catch (err) { next(err); }
}

export async function unfollowUser(req, res, next) {
  try {
    await usersService.unfollowUser(req.user._id, req.params.id);
    sendSuccess(res, { message: 'User unfollowed successfully' });
  } catch (err) { next(err); }
}

export async function sendFriendRequest(req, res, next) {
  try {
    const request = await usersService.sendFriendRequest(req.user._id, req.params.id);
    sendSuccess(res, { data: { request }, message: 'Friend request sent', statusCode: 201 });
  } catch (err) { next(err); }
}

export async function respondToFriendRequest(req, res, next) {
  try {
    const request = await usersService.respondToFriendRequest(req.params.requestId, req.user._id, req.params.action);
    sendSuccess(res, { data: { request }, message: `Friend request ${req.params.action}ed` });
  } catch (err) { next(err); }
}

export async function getFriends(req, res, next) {
  try {
    const { friends, meta } = await usersService.getFriends(req.params.id || req.user._id, req.query);
    sendPaginated(res, friends, meta);
  } catch (err) { next(err); }
}

export async function getFollowers(req, res, next) {
  try {
    const { followers, meta } = await usersService.getFollowers(req.params.id || req.user._id, req.query);
    sendPaginated(res, followers, meta);
  } catch (err) { next(err); }
}

export async function getFollowing(req, res, next) {
  try {
    const { following, meta } = await usersService.getFollowing(req.params.id || req.user._id, req.query);
    sendPaginated(res, following, meta);
  } catch (err) { next(err); }
}

export async function getPendingFriendRequests(req, res, next) {
  try {
    const { requests, meta } = await usersService.getPendingFriendRequests(req.user._id, req.query);
    sendPaginated(res, requests, meta);
  } catch (err) { next(err); }
}

export async function getSuggestions(req, res, next) {
  try {
    const { suggestions, meta } = await usersService.getFriendSuggestions(req.user._id, req.query);
    sendPaginated(res, suggestions, meta);
  } catch (err) { next(err); }
}

export async function blockUser(req, res, next) {
  try {
    await usersService.blockUser(req.user._id, req.params.id);
    sendSuccess(res, { message: 'User blocked successfully' });
  } catch (err) { next(err); }
}

export async function unblockUser(req, res, next) {
  try {
    await usersService.unblockUser(req.user._id, req.params.id);
    sendSuccess(res, { message: 'User unblocked successfully' });
  } catch (err) { next(err); }
}

export async function getBlockedUsers(req, res, next) {
  try {
    const blocked = await usersService.getBlockedUsers(req.user._id);
    sendSuccess(res, { data: { blocked } });
  } catch (err) { next(err); }
}

