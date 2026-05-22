import Course from '../models/Course.js';
import Session from '../models/Session.js';
import Enrollment from '../models/Enrollment.js';
import ChatMessage from '../models/ChatMessage.js';
import User from '../models/User.js';
import { TestAttempt } from '../models/Test.js';
import { escapeRegex } from '../middleware/validate.js';

export const getCourses = async (req, res) => {
  try {
    const { category, level, search, price, minPrice, page = 1, limit = 12 } = req.query;
    // Show published courses that are NOT explicitly marked as 'classroom'
    let filter = { status: 'published', type: { $ne: 'classroom' } };

    if (category) filter.categories = { $in: [category] };
    if (level) filter.level = level.toLowerCase();
    if (price !== undefined) filter.price = Number(price);
    if (minPrice) filter.price = { $gte: Number(minPrice) };
    if (search) {
      filter.$or = [
        { title: { $regex: escapeRegex(search), $options: 'i' } },
        { description: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const courses = await Course.find(filter)
      .populate('instructor', 'firstName lastName avatar')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Course.countDocuments(filter);

    res.json({ courses, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

export const getCourseDetail = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'firstName lastName avatar bio')
      .lean();

    if (!course) return res.status(404).json({ error: 'Course not found' });

    const sessions = await Session.find({ courseId: req.params.id }).sort({ order: 1 });
    let userEnrollment = null;
    let passedTestIds = [];

    if (req.userId) {
      userEnrollment = await Enrollment.findOne({ userId: req.userId, courseId: req.params.id });
      if (userEnrollment) {
        // Find all passed test attempts for this user
        const attempts = await TestAttempt.find({ userId: req.userId, passed: true }).select('testId');
        passedTestIds = attempts.map(a => a.testId.toString());
      }
    }

    // Determine which sessions are locked
    let prerequisiteFailed = false;
    const processedSessions = sessions.map((session, index) => {
      const sessionObj = session.toObject();
      let isLocked = false;

      // Rule: Session is locked if ANY previous session had a required test that wasn't passed
      if (prerequisiteFailed) {
        isLocked = true;
      }

      // Check if THIS session has a test that the user hasn't passed yet
      // If it does, all FUTURE sessions (index + 1, etc.) will be locked
      if (session.testId && !passedTestIds.includes(session.testId.toString())) {
        prerequisiteFailed = true;
      }

      return { ...sessionObj, isLocked };
    });

    const studentCount = await Enrollment.countDocuments({ courseId: req.params.id });
    course.totalEnrollments = studentCount;
    course.enrollmentCount = studentCount;

    res.json({ course, sessions: processedSessions, enrollment: userEnrollment, studentCount });
  } catch (error) {
    console.error('Get course detail error:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
};

export const createCourse = async (req, res) => {
  try {
    const { title, description, categories, level, price, thumbnail, language } = req.body;

    if (!title || !description || !categories || !Array.isArray(categories)) {
      return res.status(400).json({ error: 'Required fields missing or invalid' });
    }

    const course = new Course({
      title,
      description,
      categories,
      level: level ? level.toLowerCase() : 'beginner',
      price: req.body.type === 'classroom' ? 0 : (price || 0),
      thumbnail,
      language: language || 'English',
      instructor: req.userId,
      status: req.body.status || 'published',
    });

    if (req.body.type === 'classroom') {
      course.type = 'classroom';
      // Generate unique 7-character class code
      let isUnique = false;
      let code;
      while (!isUnique) {
        code = Math.random().toString(36).substring(2, 9).toUpperCase();
        const existing = await Course.findOne({ classCode: code });
        if (!existing) isUnique = true;
      }
      course.classCode = code;
    }

    await course.save();
    res.status(201).json({ message: 'Course created', course });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
};

export const updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.instructor.toString() !== req.userId) return res.status(403).json({ error: 'Not authorized' });

    const allowed = ['title', 'description', 'categories', 'level', 'price', 'thumbnail', 'status', 'finalTestId', 'language', 'type', 'classCode'];
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        if (field === 'level') {
          course[field] = req.body[field].toLowerCase();
        } else if (field === 'price' && (req.body.type === 'classroom' || course.type === 'classroom')) {
          course[field] = 0;
        } else if (field === 'type' && req.body.type === 'classroom' && !course.classCode) {
          // Generate unique 7-character class code if switching to classroom
          let isUnique = false;
          let code;
          while (!isUnique) {
            code = Math.random().toString(36).substring(2, 9).toUpperCase();
            const existing = await Course.findOne({ classCode: code });
            if (!existing) isUnique = true;
          }
          course.classCode = code;
          course.type = 'classroom';
        } else {
          course[field] = req.body[field];
        }
      }
    }

    await course.save();
    res.json(course);
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    if (course.instructor.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Course.findByIdAndDelete(req.params.id);
    await Session.deleteMany({ courseId: req.params.id });
    await Enrollment.deleteMany({ courseId: req.params.id });

    res.json({ message: 'Course deleted' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
};

export const enrollCourse = async (req, res) => {
  try {
    const { courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.status !== 'published') return res.status(400).json({ error: 'Course is not available for enrollment' });
    if (course.instructor.toString() === req.userId) return res.status(400).json({ error: 'You cannot enroll in your own course' });

    // Check for duplicate enrollment
    const existingEnrollment = await Enrollment.findOne({ userId: req.userId, courseId });
    if (existingEnrollment) {
      if (existingEnrollment.status === 'completed') {
        return res.status(400).json({ error: 'You have already completed this course and cannot re-enroll.' });
      }
      return res.status(400).json({ error: 'Already enrolled in this course.' });
    }

    // For paid courses, redirect to checkout
    if (course.price > 0) {
      return res.json({
        requiresPayment: true,
        courseId: course._id,
        price: course.price,
        title: course.title,
      });
    }

    // Free course - enroll directly
    const enrollment = new Enrollment({
      userId: req.userId,
      courseId,
      enrollmentDate: new Date(),
    });

    await enrollment.save();
    await Course.findByIdAndUpdate(courseId, { $inc: { totalEnrollments: 1 } });

    // Add a join message to the course chat channel
    const enrolledUser = await User.findById(req.userId).select('firstName lastName');
    const channelRoomId = `course_${courseId}`;
    await ChatMessage.create({
      senderId: req.userId,
      roomId: channelRoomId,
      content: `${enrolledUser.firstName} ${enrolledUser.lastName} joined the course channel!`,
    });

    res.status(201).json({ message: 'Enrolled successfully', enrollment });
  } catch (error) {
    console.error('Enroll course error:', error);
    res.status(500).json({ error: 'Failed to enroll' });
  }
};

export const joinClassByCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Class code is required' });

    const course = await Course.findOne({ classCode: code.toUpperCase(), type: 'classroom' });
    if (!course) return res.status(404).json({ error: 'Class not found or invalid code' });

    if (course.instructor.toString() === req.userId) {
      return res.status(400).json({ error: 'You are the instructor of this class' });
    }

    // Check duplicate enrollment
    const existingEnrollment = await Enrollment.findOne({ userId: req.userId, courseId: course._id });
    if (existingEnrollment) {
      return res.status(400).json({ error: 'Already joined this class' });
    }

    const enrollment = new Enrollment({
      userId: req.userId,
      courseId: course._id,
      enrollmentDate: new Date(),
    });

    await enrollment.save();
    await Course.findByIdAndUpdate(course._id, { $inc: { totalEnrollments: 1 } });

    // Add join message
    const joinedUser = await User.findById(req.userId).select('firstName lastName');
    await ChatMessage.create({
      senderId: req.userId,
      roomId: `course_${course._id}`,
      content: `${joinedUser.firstName} ${joinedUser.lastName} joined the classroom!`,
    });

    res.status(201).json({ message: 'Joined classroom successfully', courseId: course._id });
  } catch (error) {
    console.error('Join class error:', error);
    res.status(500).json({ error: 'Failed to join class' });
  }
};

export const unenrollCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const enrollment = await Enrollment.findOne({ userId: req.userId, courseId });
    
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
    
    // Prevent unenrollment if course is completed
    if (enrollment.status === 'completed') {
      return res.status(400).json({ error: 'You have completed this course and cannot leave it. It will stay in your history.' });
    }

    await Enrollment.deleteOne({ _id: enrollment._id });

    // Decrement totalEnrollments
    await Course.findByIdAndUpdate(courseId, { $inc: { totalEnrollments: -1 } });

    res.json({ message: 'Successfully unenrolled' });
  } catch (error) {
    console.error('Unenroll course error:', error);
    res.status(500).json({ error: 'Failed to unenroll' });
  }
};

export const processCheckout = async (req, res) => {
  try {
    const { courseId, cardNumber, expiryDate, cvv, cardName } = req.body;

    // Validate card fields exist (MVP - no real validation)
    if (!cardNumber || !expiryDate || !cvv || !cardName) {
      return res.status(400).json({ error: 'All card fields are required' });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.status !== 'published') return res.status(400).json({ error: 'Course not available' });
    if (course.instructor.toString() === req.userId) return res.status(400).json({ error: 'You cannot enroll in your own course' });

    // Check duplicate
    const existing = await Enrollment.findOne({ userId: req.userId, courseId });
    if (existing) {
      if (existing.status === 'completed') {
        return res.status(400).json({ error: 'You have already completed this course.' });
      }
      return res.status(400).json({ error: 'Already enrolled in this course.' });
    }

    // MVP: Simulate payment processing (always succeeds)
    const paymentId = 'PAY_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // Create enrollment
    const enrollment = await Enrollment.create({
      userId: req.userId,
      courseId,
      enrollmentDate: new Date(),
    });

    course.totalEnrollments += 1;
    await course.save();

    // Add a join message to the course chat channel
    const paidUser = await User.findById(req.userId).select('firstName lastName');
    const channelRoomId = `course_${courseId}`;
    await ChatMessage.create({
      senderId: req.userId,
      roomId: channelRoomId,
      content: `${paidUser.firstName} ${paidUser.lastName} joined the course channel!`,
    });

    res.status(201).json({
      message: 'Payment successful! You are now enrolled.',
      paymentId,
      enrollment,
      course: { title: course.title, _id: course._id }
    });
  } catch (error) {
    console.error('Process checkout error:', error);
    res.status(500).json({ error: 'Failed to process checkout' });
  }
};

export const getEnrolledCourses = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ userId: req.userId })
      .populate('courseId')
      .sort({ enrollmentDate: -1 });

    const courses = enrollments.map(e => ({
      ...e.courseId.toObject(),
      progress: e.progress,
      status: e.status,
      isBlocked: e.isBlocked || false,
      enrollmentId: e._id,
    }));

    res.json(courses);
  } catch (error) {
    console.error('Get enrolled courses error:', error);
    res.status(500).json({ error: 'Failed to fetch enrolled courses' });
  }
};

export const getProgress = async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({
      userId: req.userId,
      courseId: req.params.courseId,
    })
      .populate('courseId')
      .populate('completedSessions');

    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

    const totalSessions = await Session.countDocuments({ courseId: req.params.courseId });

    res.json({
      enrollmentId: enrollment._id,
      progress: enrollment.progress,
      completedCount: enrollment.completedSessions.length,
      totalSessions,
      status: enrollment.status,
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
};

export const getMyCourses = async (req, res) => {
  try {
    const courses = await Course.find({ instructor: req.userId }).sort({ createdAt: -1 });

    // Add accurate enrollment count for each course
    const coursesWithCounts = await Promise.all(
      courses.map(async (course) => {
        const enrollmentCount = await Enrollment.countDocuments({ courseId: course._id });
        const courseObj = course.toObject ? course.toObject() : course;
        return {
          ...courseObj,
          enrollmentCount,
          totalEnrollments: enrollmentCount,
        };
      })
    );

    res.json(coursesWithCounts);
  } catch (error) {
    console.error('Get my courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

export const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    // Check if user is enrolled
    const enrollment = await Enrollment.findOne({ userId: req.userId, courseId: req.params.id });
    if (!enrollment) return res.status(403).json({ error: 'You must be enrolled to review' });

    // Check if already reviewed
    const existingReview = course.reviews.find(r => r.userId?.toString() === req.userId);
    if (existingReview) {
      existingReview.rating = rating;
      existingReview.comment = comment || '';
    } else {
      course.reviews.push({ userId: req.userId, rating, comment: comment || '' });
    }

    // Recalculate average rating
    const totalRating = course.reviews.reduce((sum, r) => sum + r.rating, 0);
    course.rating = totalRating / course.reviews.length;

    await course.save();
    res.json({ message: 'Review saved', reviews: course.reviews, rating: course.rating });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ error: 'Failed to add review' });
  }
};

export const createSession = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.instructor.toString() !== req.userId) return res.status(403).json({ error: 'Not authorized' });

    const session = await Session.create({
      courseId: req.params.courseId,
      title: req.body.title,
      description: req.body.description || '',
      videoUrl: req.body.videoUrl || '',
      pdfUrl: req.body.pdfUrl || '',
      testId: req.body.testId || null,
      order: req.body.order || 1,
      duration: req.body.duration || 0,
      isPublished: true,
    });

    course.totalSessions = await Session.countDocuments({ courseId: req.params.courseId });
    await course.save();

    res.status(201).json(session);
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
};

export const completeSession = async (req, res) => {
  try {
    const { courseId, sessionId } = req.params;
    const enrollment = await Enrollment.findOne({ userId: req.userId, courseId });
    if (!enrollment) return res.status(404).json({ error: 'Not enrolled' });
    if (enrollment.isBlocked) return res.status(403).json({ error: 'Your access to this course has been restricted by the instructor.' });

    // Check if session is locked by prerequisites
    const sessions = await Session.find({ courseId }).sort({ order: 1 });
    const passedAttempts = await TestAttempt.find({ userId: req.userId, passed: true }).select('testId');
    const passedTestIds = passedAttempts.map(a => a.testId.toString());

    let prerequisiteFailed = false;
    let isSessionLocked = false;

    for (const session of sessions) {
      if (session._id.toString() === sessionId) {
        if (prerequisiteFailed) isSessionLocked = true;
        break;
      }
      if (session.testId && !passedTestIds.includes(session.testId.toString())) {
        prerequisiteFailed = true;
      }
    }

    if (isSessionLocked) {
      return res.status(403).json({ error: 'This session is locked until you pass the prerequisite tests.' });
    }

    if (!enrollment.completedSessions.some(id => id.toString() === sessionId)) {
      enrollment.completedSessions.push(sessionId);
    }

    // Deduplicate in case of prior bug
    const uniqueIds = [...new Set(enrollment.completedSessions.map(id => id.toString()))];
    enrollment.completedSessions = uniqueIds;

    const totalSessions = await Session.countDocuments({ courseId });
    const course = await Course.findById(courseId);
    
    // Progress calculation
    let calculatedProgress = totalSessions > 0 ? Math.round((uniqueIds.length / totalSessions) * 100) : 0;
    
    // If there's a final exam, cap progress at 99% until it's passed
    if (course.finalTestId && calculatedProgress >= 100) {
      calculatedProgress = 99;
    }

    enrollment.progress = calculatedProgress;

    // Only mark as completed automatically if there's NO final exam
    if (!course.finalTestId && enrollment.progress >= 100) {
      enrollment.status = 'completed';
      enrollment.certificateEarned = true;
      enrollment.certificateEarnedAt = new Date();
    }
    await enrollment.save();

    res.json({ progress: enrollment.progress, completedSessions: enrollment.completedSessions });
  } catch (error) {
    console.error('Complete session error:', error);
    res.status(500).json({ error: 'Failed to complete session' });
  }
};

export const updateSession = async (req, res) => {
  try {
    const { courseId, sessionId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.instructor.toString() !== req.userId) return res.status(403).json({ error: 'Not authorized' });

    const session = await Session.findOne({ _id: sessionId, courseId });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const allowed = ['title', 'videoUrl', 'pdfUrl', 'testId', 'order', 'duration', 'description'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) session[field] = req.body[field];
    });

    await session.save();
    res.json(session);
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
};

export const deleteSession = async (req, res) => {
  try {
    const { courseId, sessionId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.instructor.toString() !== req.userId) return res.status(403).json({ error: 'Not authorized' });

    await Session.findOneAndDelete({ _id: sessionId, courseId });
    course.totalSessions = await Session.countDocuments({ courseId });
    await course.save();

    res.json({ message: 'Session deleted' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
};

export const getCourseStudents = async (req, res) => {
  try {
    const courseId = req.params.courseId;

    // Verify course exists and user is instructor
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.instructor.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to view course students' });
    }

    // Get all enrollments with student details
    const enrollments = await Enrollment.find({ courseId })
      .populate('userId', 'firstName lastName email avatar')
      .sort({ enrollmentDate: -1 });

    const students = enrollments.map(e => ({
      enrollmentId: e._id,
      userId: e.userId._id,
      firstName: e.userId.firstName,
      lastName: e.userId.lastName,
      email: e.userId.email,
      avatar: e.userId.avatar,
      enrollmentDate: e.enrollmentDate,
      progress: e.progress,
      status: e.status,
      completedSessions: e.completedSessions.length,
      certificateEarned: e.certificateEarned,
      isBlocked: e.isBlocked || false,
    }));

    res.json({ students, total: students.length });
  } catch (error) {
    console.error('Get course students error:', error);
    res.status(500).json({ error: 'Failed to fetch course students' });
  }
};

export const removeStudentFromCourse = async (req, res) => {
  try {
    const { courseId, enrollmentId } = req.params;

    // Verify course exists and user is instructor
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.instructor.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Remove enrollment
    const enrollment = await Enrollment.findByIdAndDelete(enrollmentId);
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

    // Decrement totalEnrollments
    await Course.findByIdAndUpdate(courseId, { $inc: { totalEnrollments: -1 } });

    res.json({ message: 'Student removed from course' });
  } catch (error) {
    console.error('Remove student error:', error);
    res.status(500).json({ error: 'Failed to remove student' });
  }
};

export const toggleBlockStudent = async (req, res) => {
  try {
    const { courseId, enrollmentId } = req.params;

    // Verify course exists and user is instructor
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.instructor.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });

    enrollment.isBlocked = !enrollment.isBlocked;
    await enrollment.save();

    res.json({ 
      message: enrollment.isBlocked ? 'Student blocked' : 'Student unblocked', 
      isBlocked: enrollment.isBlocked 
    });
  } catch (error) {
    console.error('Toggle block student error:', error);
    res.status(500).json({ error: 'Failed to toggle block status' });
  }
};
