import { Router } from 'express';
import { authMiddleware, roleCheck } from '../middleware/auth.js';
import { validateTest } from '../middleware/validate.js';
import { getTests, getTest, createTest, updateTest, deleteTest, startTest, submitAnswer, submitTest, getAttempt, getMyTests, getMyAttempts, getTestAttempts, generateTestAI } from '../controllers/testController.js';

const router = Router();

// Static routes FIRST
router.get('/', getTests);
router.get('/my', authMiddleware, getMyTests);
router.get('/my-attempts', authMiddleware, getMyAttempts);
router.post('/', authMiddleware, roleCheck('instructor', 'admin'), validateTest, createTest);
router.post('/generate', authMiddleware, roleCheck('instructor', 'admin'), generateTestAI);
router.post('/start', authMiddleware, roleCheck('student'), startTest);
router.post('/submit-answer', authMiddleware, roleCheck('student'), submitAnswer);
router.post('/submit-test', authMiddleware, roleCheck('student'), submitTest);
router.get('/attempts/:attemptId', authMiddleware, getAttempt);

// Dynamic :testId routes AFTER
router.get('/:testId', getTest);
router.get('/:testId/attempts', authMiddleware, getTestAttempts);
router.put('/:testId', authMiddleware, roleCheck('instructor', 'admin'), updateTest);
router.delete('/:testId', authMiddleware, roleCheck('instructor', 'admin'), deleteTest);

export default router;
