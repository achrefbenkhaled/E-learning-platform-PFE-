import mongoose from 'mongoose';
import ChatMessage from '../models/ChatMessage.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import User from '../models/User.js';

export const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { before, limit = 50 } = req.query;

    // For course channels, verify user is enrolled or is the instructor (unless admin)
    if (roomId.startsWith('course_')) {
      const isAdmin = req.userRoles?.includes('admin');
      if (!isAdmin) {
        const courseId = roomId.replace('course_', '');
        const course = await Course.findById(courseId);
        if (course) {
          const isInstructor = course.instructor.toString() === req.userId;
          const isEnrolled = await Enrollment.findOne({ userId: req.userId, courseId });
          if (!isInstructor && !isEnrolled) {
            return res.status(403).json({ error: 'You must be enrolled to view this channel' });
          }
        }
      }
    }

    const query = { roomId, isDeleted: { $ne: true } };
    if (before) query.createdAt = { $lt: new Date(before) };

    const messages = await ChatMessage.find(query)
      .populate('senderId', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(messages.reverse());
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const getRooms = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);

    // Get all rooms this user has sent messages in
    const roomIds = await ChatMessage.distinct('roomId', { senderId: userId });

    // Also find DM rooms where the user received messages
    const dmPattern = new RegExp(req.userId);
    const dmRoomIds = await ChatMessage.distinct('roomId', { roomId: dmPattern });

    // Merge and dedupe
    const allRooms = [...new Set([...roomIds, ...dmRoomIds])];

    // Always include general room
    if (!allRooms.includes('general')) allRooms.unshift('general');

    // Get course channels
    const courseChannels = [];
    const isAdmin = req.userRoles?.includes('admin');

    if (isAdmin) {
      // Admins see ALL published course channels
      const allCourses = await Course.find({ status: 'published' }).select('title thumbnail');
      for (const course of allCourses) {
        courseChannels.push({
          roomId: `course_${course._id}`,
          courseId: course._id,
          courseTitle: course.title,
          courseThumbnail: course.thumbnail,
        });
      }
    } else {
      // Students see channels for enrolled courses
      const enrollments = await Enrollment.find({ userId: req.userId }).populate('courseId', 'title thumbnail instructor');
      for (const enrollment of enrollments) {
        if (enrollment.courseId) {
          const channelId = `course_${enrollment.courseId._id}`;
          courseChannels.push({
            roomId: channelId,
            courseId: enrollment.courseId._id,
            courseTitle: enrollment.courseId.title,
            courseThumbnail: enrollment.courseId.thumbnail,
          });
          // Remove from allRooms if it's there
          const idx = allRooms.indexOf(channelId);
          if (idx !== -1) allRooms.splice(idx, 1);
        }
      }

      // Instructors see channels for courses they instruct
      const instructedCourses = await Course.find({ instructor: req.userId, status: 'published' }).select('title thumbnail');
      for (const course of instructedCourses) {
        const channelId = `course_${course._id}`;
        if (!courseChannels.find(c => c.roomId === channelId)) {
          courseChannels.push({
            roomId: channelId,
            courseId: course._id,
            courseTitle: course.title,
            courseThumbnail: course.thumbnail,
          });
          const idx = allRooms.indexOf(channelId);
          if (idx !== -1) allRooms.splice(idx, 1);
        }
      }
    }

    // Build room info for general + DM rooms
    const rooms = await Promise.all(allRooms.map(async (roomId) => {
      const lastMessage = await ChatMessage.findOne({ roomId })
        .populate('senderId', 'firstName lastName')
        .sort({ createdAt: -1 });

      const unread = await ChatMessage.countDocuments({
        roomId,
        senderId: { $ne: userId },
        readBy: { $ne: userId },
        createdAt: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });

      // For DM rooms, get the other user's info
      let roomName = roomId;
      let roomAvatar = null;
      let isDM = false;

      if (roomId.includes('_dm_')) {
        isDM = true;
        const userIds = roomId.split('_dm_');
        const otherUserId = userIds.find(id => id !== req.userId);
        if (otherUserId) {
          const otherUser = await User.findById(otherUserId).select('firstName lastName avatar');
          if (otherUser) {
            roomName = `${otherUser.firstName} ${otherUser.lastName}`;
            roomAvatar = otherUser.avatar;
          }
        }
      }

      return {
        roomId,
        roomName,
        roomAvatar,
        isDM,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          sender: lastMessage.senderId ? `${lastMessage.senderId.firstName}` : 'Unknown',
          time: lastMessage.createdAt,
        } : null,
        unread,
      };
    }));

    // Build course channel info
    const courseRooms = await Promise.all(courseChannels.map(async (ch) => {
      const lastMessage = await ChatMessage.findOne({ roomId: ch.roomId })
        .populate('senderId', 'firstName lastName')
        .sort({ createdAt: -1 });

      const unread = await ChatMessage.countDocuments({
        roomId: ch.roomId,
        senderId: { $ne: userId },
        readBy: { $ne: userId },
        createdAt: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });

      // Count members (enrollments + instructor)
      const memberCount = await Enrollment.countDocuments({ courseId: ch.courseId });

      return {
        roomId: ch.roomId,
        roomName: ch.courseTitle,
        roomAvatar: ch.courseThumbnail,
        isCourseChannel: true,
        courseId: ch.courseId,
        memberCount,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          sender: lastMessage.senderId ? `${lastMessage.senderId.firstName}` : 'Unknown',
          time: lastMessage.createdAt,
        } : null,
        unread,
      };
    }));

    res.json({ rooms, courseChannels: courseRooms });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.userId } })
      .select('firstName lastName avatar email roles')
      .sort({ firstName: 1 })
      .limit(50);
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const markRoomAsRead = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.userId);
    await ChatMessage.updateMany(
      { roomId, senderId: { $ne: userId }, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );
    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Mark room read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};
