import express from 'express';
import { createReport, getReports, updateReportStatus } from '../controllers/reportController.js';
import { authMiddleware, roleCheck } from '../middleware/auth.js';

const router = express.Router();

// Public report creation (protected by login)
router.post('/', authMiddleware, createReport);

// Admin only routes
router.get('/', authMiddleware, roleCheck('admin'), getReports);
router.put('/:id', authMiddleware, roleCheck('admin'), updateReportStatus);

export default router;
