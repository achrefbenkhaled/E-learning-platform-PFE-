import express from 'express';
import {
  createRequest,
  getMyRequest,
  getAllRequests,
  updateRequestStatus,
} from '../controllers/instructorRequestController.js';
import { authMiddleware, roleCheck } from '../middleware/auth.js';

const router = express.Router();

// Student routes
router.post('/', authMiddleware, roleCheck('student'), createRequest);
router.get('/my', authMiddleware, getMyRequest);

// Admin routes
router.get('/admin', authMiddleware, roleCheck('admin'), getAllRequests);
router.put('/admin/:id', authMiddleware, roleCheck('admin'), updateRequestStatus);

export default router;
