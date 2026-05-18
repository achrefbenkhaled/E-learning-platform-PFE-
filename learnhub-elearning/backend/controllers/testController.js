import { Test, TestAttempt } from '../models/Test.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { extractTextFromPdfUrl } from '../utils/pdf.js';
import { generateTestFromText } from '../utils/ai.js';

export const getMyTests = async (req, res) => {
  try {
    const tests = await Test.find({ createdBy: req.userId })
      .populate('createdBy', 'firstName lastName avatar')
      .sort({ createdAt: -1 });

    // Attach attempt count for each test
    const testsWithCounts = await Promise.all(
      tests.map(async (t) => {
        const attemptCount = await TestAttempt.countDocuments({ testId: t._id });
        return { ...t.toObject(), attemptCount };
      })
    );

    res.json({ tests: testsWithCounts });
  } catch (error) {
    console.error('Get my tests error:', error);
    res.status(500).json({ error: 'Failed to fetch your tests' });
  }
};

export const getMyAttempts = async (req, res) => {
  try {
    const attempts = await TestAttempt.find({ userId: req.userId })
      .populate('testId', 'title description settings')
      .sort({ startedAt: -1 });
      
    res.json({ attempts });
  } catch (error) {
    console.error('Get my attempts error:', error);
    res.status(500).json({ error: 'Failed to fetch your test attempts' });
  }
};

export const getTestAttempts = async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) return res.status(404).json({ error: 'Test not found' });
    if (test.createdBy.toString() !== req.userId) {
      return res.status(403).json({ error: 'Only the test creator can view participants' });
    }

    const attempts = await TestAttempt.find({ testId: req.params.testId })
      .populate('userId', 'firstName lastName email avatar')
      .sort({ submittedAt: -1 });

    res.json({
      test: {
        _id: test._id,
        title: test.title,
        questionCount: test.questions.length,
        settings: test.settings,
      },
      attempts,
    });
  } catch (error) {
    console.error('Get test attempts error:', error);
    res.status(500).json({ error: 'Failed to fetch test attempts' });
  }
};

export const getTests = async (req, res) => {
  try {
    // If the user is logged in, show public tests + course tests they are enrolled in
    // If not logged in, only show public tests (courseId: null)
    let query = { status: 'published' };
    
    if (req.userId) {
      // Find courses the user is enrolled in
      const enrollments = await Enrollment.find({ userId: req.userId }).select('courseId');
      const enrolledCourseIds = enrollments.map(e => e.courseId);
      
      query = {
        $and: [
          { status: 'published' },
          {
            $or: [
              { courseId: null }, // Public tests
              { courseId: { $exists: false } }, // Also public
              { courseId: { $in: enrolledCourseIds } }, // Tests for their courses
              { createdBy: req.userId } // Their own tests (if they are instructor)
            ]
          }
        ]
      };
    } else {
      // Not logged in: only public tests
      query = { 
        status: 'published',
        $or: [{ courseId: null }, { courseId: { $exists: false } }]
      };
    }

    const tests = await Test.find(query)
      .populate('createdBy', 'firstName lastName avatar')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Test.countDocuments(query);

    res.json({ tests, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get tests error:', error);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
};

export const getTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId).populate('createdBy', 'firstName lastName avatar');
    if (!test) return res.status(404).json({ error: 'Test not found' });

    // Check if user is blocked from parent course
    let isBlocked = false;
    if (test.courseId && req.userId) {
      const enrollment = await Enrollment.findOne({ userId: req.userId, courseId: test.courseId });
      if (enrollment && enrollment.isBlocked) {
        isBlocked = true;
      }
    }

    const testObj = test.toObject();
    testObj.isBlocked = isBlocked;

    res.json(testObj);
  } catch (error) {
    console.error('Get test error:', error);
    res.status(500).json({ error: 'Failed to fetch test' });
  }
};

export const createTest = async (req, res) => {
  try {
    const { title, description, questions, settings, status, courseId, type, sessionId } = req.body;

    // Check if user is an instructor
    if (!req.userRoles || !req.userRoles.includes('instructor')) {
      return res.status(403).json({ error: 'Only instructors can create tests' });
    }

    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'Title and questions required' });
    }

    // Validate course ownership if courseId provided
    if (courseId) {
      const course = await Course.findById(courseId);
      if (!course) return res.status(404).json({ error: 'Course not found' });
      if (course.instructor.toString() !== req.userId) {
        return res.status(403).json({ error: 'Only the course instructor can add tests' });
      }
    }

    const testType = type || 'quiz';
    const finalSettings = settings || {};
    
    // Final tests MUST require anti-cheat
    if (testType === 'final') {
      finalSettings.requireAntiCheat = true;
    }

    const test = new Test({
      title,
      description,
      questions,
      settings: finalSettings,
      status: status || 'published',
      createdBy: req.userId,
      courseId: courseId || null,
      sessionId: sessionId || null,
      type: testType,
    });

    await test.save();
    res.status(201).json({ message: 'Test created', test });
  } catch (error) {
    console.error('Create test error:', error);
    res.status(500).json({ error: 'Failed to create test' });
  }
};

export const getCourseTests = async (req, res) => {
  try {
    const { courseId } = req.params;
    const tests = await Test.find({ courseId, status: { $in: ['published', 'draft'] } })
      .populate('createdBy', 'firstName lastName avatar')
      .sort({ createdAt: -1 });
    res.json(tests);
  } catch (error) {
    console.error('Get course tests error:', error);
    res.status(500).json({ error: 'Failed to fetch course tests' });
  }
};

export const updateTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) return res.status(404).json({ error: 'Test not found' });

    if (test.createdBy.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const allowed = ['title', 'description', 'questions', 'settings', 'status'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) test[field] = req.body[field];
    });
    await test.save();
    res.json({ message: 'Test updated', test });
  } catch (error) {
    console.error('Update test error:', error);
    res.status(500).json({ error: 'Failed to update test' });
  }
};

export const deleteTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.testId);
    if (!test) return res.status(404).json({ error: 'Test not found' });

    if (test.createdBy.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Test.findByIdAndDelete(req.params.testId);
    res.json({ message: 'Test deleted' });
  } catch (error) {
    console.error('Delete test error:', error);
    res.status(500).json({ error: 'Failed to delete test' });
  }
};

export const startTest = async (req, res) => {
  try {
    const { testId } = req.body;
    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ error: 'Test not found' });

    // Enrollment and Block check
    if (test.courseId) {
      const enrollment = await Enrollment.findOne({ userId: req.userId, courseId: test.courseId });
      
      // If the test belongs to a course, you MUST be enrolled (unless you are the creator)
      if (!enrollment && test.createdBy.toString() !== req.userId) {
        return res.status(403).json({ error: 'You must be enrolled in the associated course to take this test.' });
      }

      if (enrollment && enrollment.isBlocked) {
        return res.status(403).json({ error: 'Your access to this test is restricted by the instructor.' });
      }
    }

    const questionsForStudent = test.questions.map(q => ({
      _id: q._id,
      question: q.question,
      type: q.type,
      options: q.options,
      points: q.points,
      attachments: q.attachments || [],
    }));

    // Anti-cheat tests: one attempt only, no resume allowed UNLESS specifically requested (handoff to locked browser)
    if (test.settings?.requireAntiCheat) {
      // Check for active attempt
      const inProgress = await TestAttempt.findOne({
        testId, userId: req.userId, status: 'in-progress',
      });

      if (inProgress) {
        // If the client requested a resume (e.g. WPF shell starting up), allow it
        if (req.body.resume === true) {
          return res.json({
            attemptId: inProgress._id,
            sessionId: inProgress.sessionId,
            questions: questionsForStudent,
            duration: test.settings?.duration,
            testTitle: test.title,
            requireCamera: test.settings?.requireCamera || false,
            requireAntiCheat: test.settings?.requireAntiCheat || false,
            resumed: true
          });
        }

        // Otherwise auto-close any lingering in-progress attempt
        inProgress.status = 'submitted';
        inProgress.submittedAt = new Date();
        await inProgress.save();
        return res.status(400).json({ error: 'Your previous anti-cheat session was closed. You cannot retake this test.' });
      }

      // Block if already submitted
      const alreadyDone = await TestAttempt.findOne({
        testId, userId: req.userId,
        status: { $in: ['submitted', 'completed', 'graded'] },
      });
      if (alreadyDone) {
        return res.status(400).json({ error: 'You have already attempted this anti-cheat test. Only one attempt is allowed.' });
      }
    }

    // Check if test is scheduled and time is valid
    const now = new Date();
    const windows = test.settings.scheduleWindows || [];

    if (windows.length > 0) {
      // Multi-window mode: check if NOW falls within any window
      const isWithinWindow = windows.some(w => now >= new Date(w.startTime) && now <= new Date(w.endTime));
      if (!isWithinWindow) {
        return res.status(400).json({ error: 'Test is not currently accessible' });
      }
    } else {
      // Legacy single-window mode
      if (test.settings.scheduledStartTime && now < test.settings.scheduledStartTime) {
        return res.status(400).json({ error: 'Test not started yet' });
      }
      if (test.settings.scheduledEndTime && now > test.settings.scheduledEndTime) {
        return res.status(400).json({ error: 'Test has ended' });
      }
    }

    // Single Result Policy: Delete previous attempts if not anti-cheat (or even if it is, 
    // depending on your preference, but here we allow retakes for normal tests)
    if (!test.settings?.requireAntiCheat) {
      await TestAttempt.deleteMany({ testId, userId: req.userId });
    }

    const sessionId = uuidv4();
    const attempt = new TestAttempt({
      testId,
      userId: req.userId,
      responses: [],
      startedAt: new Date(),
      sessionId,
      status: 'in-progress',
    });

    await attempt.save();

    // Frontend gate page now handles the secure launch request.
    // The backend just creates the attempt.

    res.json({
      attemptId: attempt._id,
      sessionId,
      questions: questionsForStudent,
      duration: test.settings?.duration,
      testTitle: test.title,
      requireCamera: test.settings?.requireCamera || false,
      requireAntiCheat: test.settings?.requireAntiCheat || false,
    });
  } catch (error) {
    console.error('Start test error:', error);
    res.status(500).json({ error: 'Failed to start test' });
  }
};

export const submitAnswer = async (req, res) => {
  try {
    const { attemptId, questionId, answer } = req.body;

    const attempt = await TestAttempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

    if (attempt.status !== 'in-progress') {
      return res.status(400).json({ error: 'Test is not in progress' });
    }

    const test = await Test.findById(attempt.testId);
    const question = test.questions.id(questionId);
    const isCorrect = question.correctAnswer === answer;

    const existingResponse = attempt.responses.find(r => r.questionId?.toString() === questionId);
    if (existingResponse) {
      existingResponse.answer = answer;
      existingResponse.isCorrect = isCorrect;
    } else {
      attempt.responses.push({ questionId, answer, isCorrect });
    }

    await attempt.save();
    res.json({ message: 'Answer saved', isCorrect });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
};

export const submitTest = async (req, res) => {
  try {
    const { attemptId, answers } = req.body;
    // answers is an object like { "questionIndex": "answer", ... }

    const attempt = await TestAttempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    if (attempt.userId.toString() !== req.userId) return res.status(403).json({ error: 'Not authorized' });
    if (attempt.status === 'submitted' || attempt.status === 'graded') return res.status(400).json({ error: 'Test already submitted' });

    const test = await Test.findById(attempt.testId);
    if (!test) return res.status(404).json({ error: 'Test not found' });

    // Normalize answers - support both array [{questionId, answer}] and object {"0":"answer"} formats
    let answersMap = {};
    if (Array.isArray(answers)) {
      answers.forEach(a => { answersMap[a.questionId ?? a.questionIndex ?? ''] = a.answer; });
    } else if (answers && typeof answers === 'object') {
      answersMap = answers;
    }

    // Prepare short answers for AI evaluation
    const shortAnswersToEval = [];
    const responses = [];

    test.questions.forEach((q, index) => {
      const userAnswer = answersMap[index.toString()] || answersMap[index] || answersMap[q._id?.toString()] || '';
      
      let isCorrect = false;
      
      if (q.type === 'multiple-choice') {
        isCorrect = userAnswer.toString().toLowerCase().trim() === q.correctAnswer?.toString().toLowerCase().trim();
      } else if (q.type === 'short-answer') {
        // Collect for batch AI evaluation
        shortAnswersToEval.push({
          index, // Store the array index to map it back later
          question: q.question,
          correctAnswerText: q.correctAnswer, // Note: the schema might use correctAnswer or correctAnswerText depending on how CreateTest saves it. Let's send what we have.
          userAnswer: userAnswer.toString()
        });
      }
      // file-response typically requires manual grading by instructor, we can leave isCorrect as false or ignore for auto-grading

      responses.push({
        questionIndex: index,
        answer: userAnswer,
        isCorrect, // Will be updated for short-answer after AI evaluation
        points: isCorrect ? (q.points || 1) : 0, // Will be updated
      });
    });

    // Evaluate short answers using AI
    if (shortAnswersToEval.length > 0) {
      const { evaluateShortAnswersAI } = await import('../utils/ai.js');
      const aiResults = await evaluateShortAnswersAI(shortAnswersToEval);
      
      // Update the responses array with AI results
      shortAnswersToEval.forEach((item, i) => {
        const isCorrect = aiResults[i] === true;
        responses[item.index].isCorrect = isCorrect;
        responses[item.index].points = isCorrect ? (test.questions[item.index].points || 1) : 0;
      });
    }

    // Calculate final scores
    let totalPoints = 0;
    let earnedPoints = 0;
    
    test.questions.forEach((q, index) => {
      totalPoints += (q.points || 1);
      earnedPoints += responses[index].points;
    });

    const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = percentage >= (test.settings?.passingScore || 50);

    attempt.responses = responses;
    attempt.score = earnedPoints;
    attempt.totalPoints = totalPoints;
    attempt.percentage = percentage;
    attempt.passed = passed;
    attempt.status = 'submitted';
    attempt.submittedAt = new Date();
    await attempt.save();

    // Course Completion Logic for Final Exams
    if (test.type === 'final' && passed) {
      const course = await Course.findOne({ finalTestId: test._id });
      if (course) {
        const enrollment = await Enrollment.findOne({ userId: req.userId, courseId: course._id });
        if (enrollment) {
          enrollment.status = 'completed';
          enrollment.certificateEarned = true;
          enrollment.certificateEarnedAt = new Date();
          // Ensure progress is 100% if they passed the final
          enrollment.progress = 100;
          await enrollment.save();
        }
      }
    }

    res.json({
      attemptId: attempt._id,
      score: earnedPoints,
      totalPoints,
      percentage,
      passed,
      responses,
      testTitle: test.title,
    });
  } catch (error) {
    console.error('Submit test error:', error);
    res.status(500).json({ error: 'Failed to submit test' });
  }
};

export const getAttempt = async (req, res) => {
  try {
    const attempt = await TestAttempt.findById(req.params.attemptId);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

    const test = await Test.findById(attempt.testId);

    // Allow both the attempt owner and the test creator to view
    const isOwner = attempt.userId.toString() === req.userId;
    const isCreator = test && test.createdBy.toString() === req.userId;
    if (!isOwner && !isCreator) return res.status(403).json({ error: 'Not authorized' });

    // Build detailed results
    const detailedResults = attempt.responses?.map((r, i) => {
      const question = test?.questions?.[r.questionIndex || i];
      return {
        question: question?.question || `Question ${i + 1}`,
        type: question?.type,
        options: question?.options,
        attachments: question?.attachments || [],
        userAnswer: r.answer,
        correctAnswer: question?.correctAnswer,
        isCorrect: r.isCorrect,
        points: r.points,
      };
    }) || [];

    res.json({
      attempt: {
        _id: attempt._id,
        testId: attempt.testId,
        userId: attempt.userId,
        score: attempt.score,
        totalPoints: attempt.totalPoints,
        percentage: attempt.percentage,
        passed: attempt.passed,
        status: attempt.status,
        completedAt: attempt.submittedAt,
        createdAt: attempt.createdAt,
      },
      testTitle: test?.title || 'Unknown Test',
      courseId: test?.courseId || null,
      results: detailedResults,
    });
  } catch (error) {
    console.error('Get attempt error:', error);
    res.status(500).json({ error: 'Failed to fetch attempt' });
  }
};

export const generateTestAI = async (req, res) => {
  try {
    const { pdfUrl, numQuestions = 5, questionType = 'multiple-choice' } = req.body;

    if (!pdfUrl) {
      return res.status(400).json({ error: 'PDF URL is required' });
    }

    // 1. Extract text from PDF
    const text = await extractTextFromPdfUrl(pdfUrl);

    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: 'Could not extract enough text from the PDF' });
    }

    // 2. Generate questions using AI
    const questions = await generateTestFromText(text, numQuestions, questionType);

    res.json({ questions });
  } catch (error) {
    console.error('Generate Test AI Error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate test questions' });
  }
};

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
