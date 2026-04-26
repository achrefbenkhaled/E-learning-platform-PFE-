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
    const user = await User.findById(req.params.id).select('firstName lastName avatar bio roles createdAt');
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Get their published courses
    const Course = (await import('../models/Course.js')).default;
    const courses = await Course.find({ instructor: user._id, status: 'published' })
      .select('title description category level price rating totalSessions totalEnrollments thumbnail')
      .limit(10);

    // Get their community posts count
    const { CommunityPost } = await import('../models/Community.js');
    const postsCount = await CommunityPost.countDocuments({ authorId: user._id });

    res.json({ user, courses, postsCount });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};
