import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getMessages, getRooms, getUsers, markRoomAsRead } from '../controllers/chatController.js';

const router = Router();
router.get('/rooms', authMiddleware, getRooms);
router.get('/users', authMiddleware, getUsers);
router.get('/:roomId/messages', authMiddleware, getMessages);
router.put('/:roomId/read', authMiddleware, markRoomAsRead);

export default router;
