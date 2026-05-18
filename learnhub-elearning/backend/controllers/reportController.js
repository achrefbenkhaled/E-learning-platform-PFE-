import Report from '../models/Report.js';
import User from '../models/User.js';

export const createReport = async (req, res) => {
  try {
    const { reportedUser, contentType, contentId, contentSnapshot, reason, description, metadata } = req.body;
    const reporter = req.userId;

    const report = new Report({
      reporter,
      reportedUser,
      contentType,
      contentId,
      contentSnapshot,
      reason,
      description,
      metadata
    });

    await report.save();
    res.status(201).json({ message: 'Report submitted successfully', report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getReports = async (req, res) => {
  try {
    // Only admin can see all reports
    if (!req.userRoles.includes('admin')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const reports = await Report.find()
      .populate('reporter', 'firstName lastName email avatar')
      .populate('reportedUser', 'firstName lastName email avatar')
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateReportStatus = async (req, res) => {
  try {
    if (!req.userRoles.includes('admin')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { status, adminNotes } = req.body;
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status, adminNotes },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json({ message: 'Report updated successfully', report });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
