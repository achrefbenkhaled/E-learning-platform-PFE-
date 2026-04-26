import User from '../models/User.js';
import Course from '../models/Course.js';
import { CommunityPost } from '../models/Community.js';
import { Test } from '../models/Test.js';
import Enrollment from '../models/Enrollment.js';

export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    let filter = {};

    if (role) filter.roles = role;

    const skip = (page - 1) * limit;
    const users = await User.find(filter)
      .select('-passwordHash')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    res.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { roles, isActive } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user) return res.status(404).json({ error: 'User not found' });

    if (roles) user.roles = roles;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();
    res.json({ message: 'User updated', user: user.toJSON() });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await Course.deleteMany({ instructor: req.params.userId });
    await Enrollment.deleteMany({ userId: req.params.userId });

    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

export const getCourses = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const courses = await Course.find()
      .populate('instructor', 'firstName lastName')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Course.countDocuments();

    res.json({ courses, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

export const approveCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const newStatus = req.body.status === 'rejected' ? 'archived' : 'published';
    course.status = newStatus;
    await course.save();

    res.json({ message: `Course ${newStatus}`, course });
  } catch (error) {
    console.error('Approve course error:', error);
    res.status(500).json({ error: 'Failed to update course status' });
  }
};

export const removeCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    res.json({ message: 'Course removed' });
  } catch (error) {
    console.error('Remove course error:', error);
    res.status(500).json({ error: 'Failed to remove course' });
  }
};

export const getModeration = async (req, res) => {
  try {
    const posts = await CommunityPost.find()
      .populate('authorId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ flaggedContent: posts });
  } catch (error) {
    console.error('Get moderation error:', error);
    res.status(500).json({ error: 'Failed to fetch moderation queue' });
  }
};

export const removePost = async (req, res) => {
  try {
    const post = await CommunityPost.findByIdAndDelete(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    res.json({ message: 'Post removed' });
  } catch (error) {
    console.error('Remove post error:', error);
    res.status(500).json({ error: 'Failed to remove post' });
  }
};

export const getTests = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;
    let filter = {};

    if (status) filter.status = status;

    const tests = await Test.find(filter)
      .populate('createdBy', 'firstName lastName email')
      .populate('courseId', 'title')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Test.countDocuments(filter);

    res.json({ tests, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get tests error:', error);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
};

export const updateTest = async (req, res) => {
  try {
    const { status } = req.body;
    const test = await Test.findById(req.params.testId);

    if (!test) return res.status(404).json({ error: 'Test not found' });

    if (status) test.status = status;

    await test.save();
    res.json({ message: 'Test updated', test });
  } catch (error) {
    console.error('Update test error:', error);
    res.status(500).json({ error: 'Failed to update test' });
  }
};

export const deleteTest = async (req, res) => {
  try {
    const test = await Test.findByIdAndDelete(req.params.testId);
    if (!test) return res.status(404).json({ error: 'Test not found' });

    res.json({ message: 'Test deleted' });
  } catch (error) {
    console.error('Delete test error:', error);
    res.status(500).json({ error: 'Failed to delete test' });
  }
};

export const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCourses = await Course.countDocuments();
    const totalEnrollments = await Enrollment.countDocuments();
    const totalPosts = await CommunityPost.countDocuments();
    const totalTests = await Test.countDocuments();

    const instructors = await User.countDocuments({ roles: 'instructor' });
    const activeCourses = await Course.countDocuments({ status: 'published' });
    const completedCourses = await Enrollment.countDocuments({ status: 'completed' });

    res.json({
      totalUsers,
      totalCourses,
      totalEnrollments,
      totalPosts,
      totalTests,
      instructors,
      activeCourses,
      completedCourses,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};
