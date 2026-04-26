import express from 'express';
import { getProfile, updateProfile, searchUsers, getPublicProfile } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/search', authMiddleware, searchUsers);
router.get('/:id', getProfile);
router.get('/:id/profile', getPublicProfile);
router.put('/:id', authMiddleware, updateProfile);

export default router;
