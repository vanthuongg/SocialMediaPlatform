// [auto] Global search query handlers
import * as searchService from './search.service.js';
import { sendSuccess, sendPaginated } from '../../shared/utils/response.utils.js';

export async function search(req, res, next) {
  try {
    const result = await searchService.search(req.query.q || '', req.query);
    sendSuccess(res, { data: result });
  } catch (err) { next(err); }
}

export async function searchByHashtag(req, res, next) {
  try {
    const { posts, meta, hashtag } = await searchService.searchByHashtag(req.params.hashtag, req.query);
    sendPaginated(res, posts, { ...meta, hashtag });
  } catch (err) { next(err); }
}
