import InstructorRequest from '../models/InstructorRequest.js';
import User from '../models/User.js';

export const createRequest = async (req, res) => {
  try {
    const { name, email, reason, experience } = req.body;
    const userId = req.userId;

    // Check if user is a student
    if (!req.userRoles.includes('student')) {
      return res.status(403).json({ error: 'Only students can request instructor access' });
    }

    // Check if user is already an instructor
    if (req.userRoles.includes('instructor')) {
      return res.status(400).json({ error: 'You are already an instructor' });
    }

    // Check for existing pending request
    const existingRequest = await InstructorRequest.findOne({ userId, status: 'pending' });
    if (existingRequest) {
      return res.status(400).json({ error: 'You already have a pending request' });
    }

    const newRequest = new InstructorRequest({
      userId,
      name,
      email,
      reason,
      experience,
    });

    await newRequest.save();
    res.status(201).json({ message: 'Request submitted successfully', request: newRequest });
  } catch (error) {
    console.error('Create instructor request error:', error);
    res.status(500).json({ error: 'Failed to submit request' });
  }
};

export const getMyRequest = async (req, res) => {
  try {
    const request = await InstructorRequest.findOne({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(request);
  } catch (error) {
    console.error('Get my request error:', error);
    res.status(500).json({ error: 'Failed to fetch request status' });
  }
};

export const getAllRequests = async (req, res) => {
  try {
    const requests = await InstructorRequest.find()
      .populate('userId', 'firstName lastName avatar')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    console.error('Get all requests error:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

export const updateRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const request = await InstructorRequest.findById(id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    request.status = status;
    await request.save();

    if (status === 'approved') {
      const user = await User.findById(request.userId);
      if (user) {
        // Ensure user has both student and instructor roles
        if (!user.roles.includes('student')) {
          user.roles.push('student');
        }
        if (!user.roles.includes('instructor')) {
          user.roles.push('instructor');
        }
        await user.save();
      }
    }

    res.json({ message: `Request ${status}`, request });
  } catch (error) {
    console.error('Update request status error:', error);
    res.status(500).json({ error: 'Failed to update request' });
  }
};
