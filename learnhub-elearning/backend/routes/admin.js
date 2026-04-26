import express from 'express';
import {
  getUsers,
  updateUser,
  deleteUser,
  getCourses,
  approveCourse,
  removeCourse,
  getModeration,
  removePost,
  getStats,
  getTests,
  updateTest,
  deleteTest,
} from '../controllers/adminController.js';
import { authMiddleware, roleCheck } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware, roleCheck('admin'));

// User management
router.get('/users', getUsers);
router.put('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);

// Course moderation
router.get('/courses', getCourses);
router.put('/courses/:courseId/approve', approveCourse);
router.delete('/courses/:courseId', removeCourse);

// Test management
router.get('/tests', getTests);
router.put('/tests/:testId', updateTest);
router.delete('/tests/:testId', deleteTest);

// Content moderation
router.get('/moderation', getModeration);
router.delete('/moderation/posts/:postId', removePost);

// Statistics
router.get('/stats', getStats);

export default router;
