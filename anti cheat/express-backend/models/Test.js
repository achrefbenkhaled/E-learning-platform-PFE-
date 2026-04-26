/**
 * Mongoose models for Test + TestAttempt.
 * Mirror of the main e-learning backend schemas so both apps share the same DB collections.
 */

const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  type: { type: String, enum: ['multiple-choice', 'short-answer', 'essay', 'file-response'], required: true },
  question: { type: String, required: true },
  options: [String],
  correctAnswer: { type: String },
  attachments: [{
    url: { type: String, required: true },
    name: { type: String, default: '' },
  }],
  points: { type: Number, default: 1 },
});

const TestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    questions: [QuestionSchema],
    settings: {
      duration: { type: Number, required: true },
      passingScore: { type: Number, default: 60 },
      shuffleQuestions: { type: Boolean, default: false },
      showResults: { type: Boolean, default: true },
      scheduledStartTime: { type: Date, default: null },
      scheduledEndTime: { type: Date, default: null },
      scheduleWindows: [{
        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true },
      }],
      openToPublic: { type: Boolean, default: true },
      requireCamera: { type: Boolean, default: false },
      requireAntiCheat: { type: Boolean, default: false },
    },
    totalAttempts: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  },
  { timestamps: true }
);

const TestAttemptSchema = new mongoose.Schema(
  {
    testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    responses: [{
      questionId: mongoose.Schema.Types.ObjectId,
      questionIndex: Number,
      answer: String,
      isCorrect: Boolean,
      points: Number,
    }],
    score: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    timeTaken: { type: Number, default: 0 },
    startedAt: { type: Date, required: true },
    submittedAt: { type: Date, default: null },
    status: { type: String, enum: ['in-progress', 'submitted', 'completed', 'graded'], default: 'in-progress' },
    sessionId: { type: String },
    proctoringData: {
      lookingAwayCount: { type: Number, default: 0 },
      phoneDetectedCount: { type: Number, default: 0 },
      multiplePersonsCount: { type: Number, default: 0 },
      noPersonCount: { type: Number, default: 0 },
      lookingAwayPercent: { type: Number, default: 0 },
      phoneDetectionPercent: { type: Number, default: 0 },
      unauthorizedPersonPercent: { type: Number, default: 0 },
      noPersonPercent: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

TestSchema.index({ status: 1, createdAt: -1 });
TestSchema.index({ courseId: 1 });
TestSchema.index({ createdBy: 1 });
TestAttemptSchema.index({ testId: 1, userId: 1 });
TestAttemptSchema.index({ userId: 1 });

const Test = mongoose.model('Test', TestSchema);
const TestAttempt = mongoose.model('TestAttempt', TestAttemptSchema);

module.exports = { Test, TestAttempt };
