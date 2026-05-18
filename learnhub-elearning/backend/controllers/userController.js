import User from '../models/User.js';
import mongoose from 'mongoose';

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, bio, avatar, settings } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user._id.toString() !== req.userId) return res.status(403).json({ error: 'Not authorized' });

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;
    if (settings) {
      if (!user.settings) user.settings = {};
      if (settings.emailNotifications !== undefined) user.settings.emailNotifications = settings.emailNotifications;
      if (settings.publicProfile !== undefined) user.settings.publicProfile = settings.publicProfile;
      if (settings.darkMode !== undefined) user.settings.darkMode = settings.darkMode;
    }

    await user.save();
    res.json(user.toJSON());
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    let filter = {};

    if (q) {
      filter.$or = [
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const users = await User.find(filter)
      .select('firstName lastName avatar bio roles')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);
    res.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
};

export const getPublicProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('firstName lastName avatar bio roles createdAt settings');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isOwner = req.userId && req.userId === user._id.toString();
    const isPublic = user.settings?.publicProfile !== false;

    if (!isPublic && !isOwner) {
      return res.json({
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          roles: user.roles,
          isPrivate: true,
        },
        courses: [],
        isPrivate: true
      });
    }

    // Get their published courses
    const Course = (await import('../models/Course.js')).default;
    const courses = await Course.find({ instructor: user._id, status: 'published' })
      .select('title description categories level price rating totalSessions totalEnrollments thumbnail type')
      .limit(10);
    
    const courseCount = await Course.countDocuments({ instructor: user._id, status: 'published' });

    // Get their community posts count
    const { CommunityPost } = await import('../models/Community.js');
    const postCount = await CommunityPost.countDocuments({ authorId: user._id });

    // Get unique student count (for instructors)
    let studentCount = 0;
    if (user.roles?.includes('instructor')) {
      const Enrollment = (await import('../models/Enrollment.js')).default;
      const instructorCourses = await Course.find({ instructor: user._id }).select('_id');
      const courseIds = instructorCourses.map(c => c._id);
      
      const uniqueStudents = await Enrollment.distinct('userId', { courseId: { $in: courseIds } });
      studentCount = uniqueStudents.length;
    }

    res.json({ 
      user: { 
        ...user.toObject(), 
        courseCount, 
        postCount, 
        studentCount 
      }, 
      courses 
    });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};
