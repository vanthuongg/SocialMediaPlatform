// [auto] Search route definitions
import { Router } from 'express';
import * as searchController from './search.controller.js';

const router = Router();

router.get('/', searchController.search);
router.get('/hashtag/:hashtag', searchController.searchByHashtag);

export default router;
