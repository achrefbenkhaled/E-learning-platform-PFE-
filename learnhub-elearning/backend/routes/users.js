import express from 'express';
import { getProfile, updateProfile, searchUsers, getPublicProfile, changePassword, saveFaceVerification } from '../controllers/userController.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
const router = express.Router();

router.get('/search', authMiddleware, searchUsers);
router.get('/:id', getProfile);
router.get('/:id/profile', optionalAuth, getPublicProfile);
router.put('/:id', authMiddleware, updateProfile);
router.put('/:id/password', authMiddleware, changePassword);
router.post('/verify-face', authMiddleware, saveFaceVerification);

export default router;
