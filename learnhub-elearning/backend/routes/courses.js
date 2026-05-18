import express from 'express';
import {
  getCourses,
  getCourseDetail,
  createCourse,
  updateCourse,
  deleteCourse,
  enrollCourse,
  unenrollCourse,
  getEnrolledCourses,
  getProgress,
  getMyCourses,
  processCheckout,
  addReview,
  createSession,
  updateSession,
  deleteSession,
  completeSession,
  getCourseStudents,
  removeStudentFromCourse,
  toggleBlockStudent,
  joinClassByCode,
} from '../controllers/courseController.js';
import { authMiddleware, optionalAuth, roleCheck } from '../middleware/auth.js';
import { validateCourse, validateReview } from '../middleware/validate.js';
import { getCourseTests } from '../controllers/testController.js';

const router = express.Router();

router.get('/', getCourses);
router.get('/my-courses/list', authMiddleware, getMyCourses);
router.get('/enrolled/list', authMiddleware, getEnrolledCourses);
router.get('/:courseId/tests', optionalAuth, getCourseTests);
router.get('/:courseId/students', authMiddleware, getCourseStudents);
router.get('/:id', optionalAuth, getCourseDetail);
router.post('/', authMiddleware, roleCheck('instructor', 'admin'), validateCourse, createCourse);
router.put('/:id', authMiddleware, roleCheck('instructor', 'admin'), validateCourse, updateCourse);
router.delete('/:id', authMiddleware, roleCheck('instructor', 'admin'), deleteCourse);
router.post('/enroll', authMiddleware, roleCheck('student'), enrollCourse);
router.post('/checkout', authMiddleware, roleCheck('student'), processCheckout);
router.post('/join-class', authMiddleware, roleCheck('student'), joinClassByCode);
router.delete('/enroll/:courseId', authMiddleware, roleCheck('student'), unenrollCourse);
router.get('/:courseId/progress', authMiddleware, roleCheck('student'), getProgress);
router.post('/:id/reviews', authMiddleware, validateReview, addReview);
router.post('/:courseId/sessions', authMiddleware, roleCheck('instructor', 'admin'), createSession);
router.put('/:courseId/sessions/:sessionId', authMiddleware, roleCheck('instructor', 'admin'), updateSession);
router.delete('/:courseId/sessions/:sessionId', authMiddleware, roleCheck('instructor', 'admin'), deleteSession);
router.post('/:courseId/sessions/:sessionId/complete', authMiddleware, roleCheck('student'), completeSession);
router.post('/:courseId/students/:enrollmentId/toggle-block', authMiddleware, roleCheck('instructor', 'admin'), toggleBlockStudent);
router.delete('/:courseId/students/:enrollmentId', authMiddleware, removeStudentFromCourse);

export default router;
