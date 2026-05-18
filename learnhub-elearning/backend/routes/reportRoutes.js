const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public report creation (protected by login)
router.post('/', protect, reportController.createReport);

// Admin only routes
router.get('/', protect, admin, reportController.getReports);
router.put('/:id', protect, admin, reportController.updateReportStatus);

module.exports = router;
