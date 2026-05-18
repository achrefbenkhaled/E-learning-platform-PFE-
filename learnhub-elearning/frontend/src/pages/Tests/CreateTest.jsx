import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Plus, Trash2, HelpCircle, Star, Clock, Target, ArrowLeft, Shuffle, Eye, Calendar, Camera, Shield } from 'lucide-react';
import useAuth from '../../hooks/useAuth.js';
import api from '../../utils/api.js';
import { validateTitle } from '../../utils/validators.js';

const emptyQuestion = () => ({
  id: Date.now(),
  type: 'multiple-choice',
  text: '',
  points: 1,
  options: ['', '', '', ''],
  correctAnswer: 0,
  correctAnswerText: '',
  attachments: [],
});

const CreateTest = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [instructorCourses, setInstructorCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(courseId || '');

  // Check if user is instructor
  useEffect(() => {
    if (!isLoading && (!user || !user.roles?.includes('instructor'))) {
      setError('Only instructors can create tests. Please contact an administrator to upgrade your account.');
      return;
    }

    const fetchMyCourses = async () => {
      try {
        const res = await api.get('/api/courses/my-courses/list');
        // If the API returns a 'courses' field, use it, otherwise use res.data
        const coursesData = res.data.courses || res.data;
        setInstructorCourses(Array.isArray(coursesData) ? coursesData : []);
      } catch (err) {
        console.error('Failed to fetch instructor courses:', err);
      }
    };
    if (user?.roles?.includes('instructor')) {
      fetchMyCourses();
    }
  }, [user, isLoading]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Settings
  const [duration, setDuration] = useState(30);
  const [passingScore, setPassingScore] = useState(50);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [scheduledStartTime, setScheduledStartTime] = useState('');
  const [scheduledEndTime, setScheduledEndTime] = useState('');
  const [requireAntiCheat, setRequireAntiCheat] = useState(false);
  const [testType, setTestType] = useState('quiz');

  // Handle type change
  const handleTypeChange = (newType) => {
    setTestType(newType);
    if (newType === 'final') {
      setRequireAntiCheat(true);
    } else {
      setRequireAntiCheat(false);
    }
  };

  // Format date to YYYY-MM-DDTHH:mm for input
  const formatDateTimeLocal = (date) => {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const handleDurationChange = (e) => {
    const newDuration = e.target.value;
    setDuration(newDuration);
    if (scheduledStartTime && newDuration) {
      const start = new Date(scheduledStartTime);
      const end = new Date(start.getTime() + newDuration * 60000);
      setScheduledEndTime(formatDateTimeLocal(end));
    }
  };

  const handleStartTimeChange = (e) => {
    const newStart = e.target.value;
    setScheduledStartTime(newStart);
    if (newStart && duration) {
      const start = new Date(newStart);
      const end = new Date(start.getTime() + duration * 60000);
      setScheduledEndTime(formatDateTimeLocal(end));
    } else if (newStart && scheduledEndTime) {
      const start = new Date(newStart);
      const end = new Date(scheduledEndTime);
      if (end > start) {
        setDuration(Math.round((end - start) / 60000));
      }
    }
  };

  const handleEndTimeChange = (e) => {
    const newEnd = e.target.value;
    setScheduledEndTime(newEnd);
    if (scheduledStartTime && newEnd) {
      const start = new Date(scheduledStartTime);
      const end = new Date(newEnd);
      if (end > start) {
        setDuration(Math.round((end - start) / 60000));
      }
    }
  };

  // Questions
  const location = useLocation();
  const [questions, setQuestions] = useState([emptyQuestion()]);

  // Load AI generated data if available
  useEffect(() => {
    if (location.state?.generatedQuestions) {
      const formatted = location.state.generatedQuestions.map((q, idx) => ({
        id: Date.now() + idx,
        type: q.type || 'multiple-choice',
        text: q.question,
        points: 1,
        options: q.options || ['', '', '', ''],
        correctAnswer: q.correctAnswer ?? 0,
        correctAnswerText: q.correctAnswerText || '',
        attachments: [],
      }));
      setQuestions(formatted);
      if (location.state.testTitle) setTitle(location.state.testTitle);
      if (location.state.testDescription) setDescription(location.state.testDescription);
    }
  }, [location.state]);

  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  };

  const removeQuestion = (index) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (index, field, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  };

  const updateOption = (qIndex, oIndex, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const newOptions = [...q.options];
        newOptions[oIndex] = value;
        return { ...q, options: newOptions };
      })
    );
  };

  const addAttachment = (qIndex) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        return { ...q, attachments: [...q.attachments, { url: '', name: '' }] };
      })
    );
  };

  const updateAttachment = (qIndex, aIndex, field, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const newAttachments = [...q.attachments];
        newAttachments[aIndex] = { ...newAttachments[aIndex], [field]: value };
        return { ...q, attachments: newAttachments };
      })
    );
  };

  const removeAttachment = (qIndex, aIndex) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        return { ...q, attachments: q.attachments.filter((_, j) => j !== aIndex) };
      })
    );
  };

  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Check instructor role
    if (!user?.roles?.includes('instructor')) {
      setError('Only instructors can create tests.');
      return;
    }

    // Validation
    const titleErr = validateTitle(title, 200);
    if (titleErr) {
      setError(titleErr);
      return;
    }
    if (questions.some((q) => !q.text.trim())) {
      setError('All questions must have text.');
      return;
    }
    if (
      questions.some(
        (q) =>
          q.type === 'multiple-choice' &&
          q.options.some((opt) => !opt.trim())
      )
    ) {
      setError('All multiple-choice options must be filled in.');
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      status: 'published',
      courseId: selectedCourseId || undefined,
      type: testType,
      settings: {
        duration: Number(duration),
        passingScore: Number(passingScore),
        shuffleQuestions,
        showResults,
        requireAntiCheat: testType === 'final' ? true : requireAntiCheat,
        scheduledStartTime: scheduledStartTime || undefined,
        scheduledEndTime: scheduledEndTime || undefined,
      },
      questions: questions.map((q) => ({
        type: q.type,
        question: q.text.trim(),
        points: Number(q.points),
        options: q.type === 'multiple-choice' ? q.options : undefined,
        attachments: q.type === 'file-response' && q.attachments.length > 0 ? q.attachments : undefined,
        correctAnswer:
          q.type === 'multiple-choice'
            ? q.options[q.correctAnswer]
            : q.type === 'file-response'
              ? q.correctAnswerText || undefined
              : undefined,
      })),
    };

    try {
      setLoading(true);
      await api.post('/api/tests', payload);
      navigate(selectedCourseId ? `/courses/${selectedCourseId}/edit` : '/tests');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create test.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  // Redirect if not instructor
  if (!user?.roles?.includes('instructor')) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-400/10 border-2 border-red-400/20 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-400/10 border-2 border-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-black text-txt mb-2">Access Denied</h2>
            <p className="text-txt-muted mb-6">Only instructors can create tests.</p>
            <button
              onClick={() => navigate('/tests')}
              className="btn-primary"
            >
              Back to Tests
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-txt">Create Test</h1>
            <p className="mt-1 text-txt-muted">
              {courseId ? 'Creating test for a course' : 'Design a new test with questions'}
            </p>
          </div>
          <button
            onClick={() => navigate(courseId ? `/courses/${courseId}/edit` : '/tests')}
            className="btn-ghost flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Test Type */}
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6">
            <h2 className="text-lg font-bold text-txt mb-4">Test Type</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleTypeChange('quiz')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  testType === 'quiz'
                    ? 'border-yellow-400 bg-yellow-400/5 shadow-[4px_4px_0px_0px_rgba(250,204,21,1)]'
                    : 'border-bdr hover:border-bdr-hover'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${testType === 'quiz' ? 'bg-yellow-400 text-black' : 'bg-surface border border-bdr text-txt-muted'}`}>
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <span className="font-black text-txt">Practice Quiz</span>
                </div>
                <p className="text-xs text-txt-muted leading-relaxed">
                  Small quiz linked to lessons for practice. Does not require anti-cheat features.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('final')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  testType === 'final'
                    ? 'border-pink-500 bg-pink-500/5 shadow-[4px_4px_0px_0px_rgba(236,72,153,1)]'
                    : 'border-bdr hover:border-bdr-hover'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${testType === 'final' ? 'bg-pink-500 text-white' : 'bg-surface border border-bdr text-txt-muted'}`}>
                    <Shield className="w-6 h-6" />
                  </div>
                  <span className="font-black text-txt">Final Exam</span>
                </div>
                <p className="text-xs text-txt-muted leading-relaxed">
                  Official evaluation at the end of the course. <span className="text-pink-500 font-bold">Requires mandatory anti-cheat/proctoring.</span>
                </p>
              </button>
            </div>
          </div>

          {/* Basic Info */}
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6">
            <h2 className="text-lg font-bold text-txt mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-txt-secondary mb-2">
                  Test Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. JavaScript Fundamentals Quiz"
                  maxLength={200}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-txt-secondary mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the test..."
                  rows={3}
                  className="input-field resize-none"
                />
              </div>
            </div>
          </div>

          {/* Course Association */}
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6">
            <h2 className="text-lg font-bold text-txt mb-4">Course Association</h2>
            <div>
              <label className="block text-sm font-semibold text-txt-secondary mb-2">
                Link to Course (Optional)
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="input-field"
              >
                <option value="">None (Public Test)</option>
                {instructorCourses.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-txt-muted">
                If linked to a course, only students enrolled in that course will be able to take this test.
              </p>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6">
            <h2 className="text-lg font-bold text-txt mb-4">Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-txt-secondary mb-2">
                  <Clock className="w-4 h-4 text-yellow-400" /> Duration (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  value={duration}
                  onChange={handleDurationChange}
                  className="input-field"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-txt-secondary mb-2">
                  <Target className="w-4 h-4 text-yellow-400" /> Passing Score (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={passingScore}
                  onChange={(e) => setPassingScore(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-txt-secondary mb-2">
                  <Calendar className="w-4 h-4 text-yellow-400" /> Scheduled Start Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledStartTime}
                  onChange={handleStartTimeChange}
                  className="input-field"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-txt-secondary mb-2">
                  <Calendar className="w-4 h-4 text-yellow-400" /> Scheduled End Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledEndTime}
                  onChange={handleEndTimeChange}
                  className="input-field"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="mt-5 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setShuffleQuestions(!shuffleQuestions)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    shuffleQuestions ? 'bg-yellow-400' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform ${
                      shuffleQuestions ? 'translate-x-5 bg-black' : 'bg-gray-400'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Shuffle className="w-4 h-4 text-txt-muted" />
                  <span className="text-sm text-txt-secondary">Shuffle questions</span>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setShowResults(!showResults)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    showResults ? 'bg-yellow-400' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform ${
                      showResults ? 'translate-x-5 bg-black' : 'bg-gray-400'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-txt-secondary">Show results to students after submission</span>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setRequireAntiCheat(!requireAntiCheat)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    requireAntiCheat ? 'bg-yellow-400' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform ${
                      requireAntiCheat ? 'translate-x-5 bg-black' : 'bg-gray-400'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-txt-muted" />
                  <span className="text-sm text-txt-secondary">Require Anti-Cheat System</span>
                </div>
              </label>
            </div>
          </div>

          {/* Questions */}
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-txt">
                Questions ({questions.length})
              </h2>
              <button
                type="button"
                onClick={addQuestion}
                className="inline-flex items-center gap-1 text-sm font-semibold text-yellow-400 hover:text-yellow-300 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Question
              </button>
            </div>

            <div className="space-y-6">
              {questions.map((question, qIndex) => (
                <div
                  key={question.id}
                  className="border-2 border-bdr rounded-xl p-5 relative bg-surface"
                >
                  {/* Question header */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="badge badge-accent">
                      Question {qIndex + 1}
                    </span>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        className="flex items-center gap-1 text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>

                  {/* Type & Points */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-semibold text-txt-secondary mb-1">
                        Question Type
                      </label>
                      <select
                        value={question.type}
                        onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}
                        className="input-field py-2 text-sm"
                      >
                        <option value="multiple-choice">Multiple Choice</option>
                        <option value="short-answer">Short Answer</option>
                        <option value="file-response">File Response (Image/PDF)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-txt-secondary mb-1">
                        Points
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={question.points}
                        onChange={(e) =>
                          updateQuestion(qIndex, 'points', e.target.value)
                        }
                        className="input-field py-2 text-sm"
                      />
                    </div>
                  </div>

                  {/* Question text */}
                  <div className="mb-3">
                    <label className="block text-xs font-semibold text-txt-secondary mb-1">
                      Question Text <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={question.text}
                      onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                      placeholder="Enter your question..."
                      rows={2}
                      className="input-field py-2 text-sm resize-none"
                    />
                  </div>

                  {/* Multiple choice options */}
                  {question.type === 'multiple-choice' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-txt-secondary">
                        Options (select the correct answer)
                      </label>
                      {question.options.map((option, oIndex) => (
                        <label
                          key={oIndex}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            question.correctAnswer === oIndex
                              ? 'border-green-400/50 bg-green-400/5'
                              : 'border-bdr hover:border-bdr-hover'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`correct-${question.id}`}
                            checked={question.correctAnswer === oIndex}
                            onChange={() =>
                              updateQuestion(qIndex, 'correctAnswer', oIndex)
                            }
                            className="accent-green-400"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) =>
                              updateOption(qIndex, oIndex, e.target.value)
                            }
                            placeholder={`Option ${oIndex + 1}`}
                            className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-txt placeholder-txt-muted p-0 focus:outline-none"
                          />
                          {question.correctAnswer === oIndex && (
                            <span className="text-xs text-green-400 font-bold">
                              Correct
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}

                  {/* File response attachments & expected answer */}
                  {question.type === 'file-response' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-txt-secondary mb-1">
                          Attachments (Image/PDF URLs)
                        </label>
                        {question.attachments.map((att, aIndex) => (
                          <div key={aIndex} className="flex items-center gap-2 mb-2">
                            <input
                              type="text"
                              value={att.name}
                              onChange={(e) => updateAttachment(qIndex, aIndex, 'name', e.target.value)}
                              placeholder="File name"
                              className="input-field py-2 text-sm flex-1"
                            />
                            <input
                              type="text"
                              value={att.url}
                              onChange={(e) => updateAttachment(qIndex, aIndex, 'url', e.target.value)}
                              placeholder="File URL"
                              className="input-field py-2 text-sm flex-[2]"
                            />
                            <button
                              type="button"
                              onClick={() => removeAttachment(qIndex, aIndex)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addAttachment(qIndex)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-400 hover:text-yellow-300 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Attachment
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-txt-secondary mb-1">
                          Expected Correct Answer
                        </label>
                        <input
                          type="text"
                          value={question.correctAnswerText}
                          onChange={(e) => updateQuestion(qIndex, 'correctAnswerText', e.target.value)}
                          placeholder="Enter the expected correct answer..."
                          className="input-field py-2 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Preview / Summary */}
          <div className="bg-yellow-400/5 rounded-2xl border-2 border-yellow-400/20 p-6">
            <h3 className="text-sm font-bold text-yellow-400 mb-3">Test Preview</h3>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="badge badge-purple inline-flex items-center gap-1">
                <HelpCircle className="w-3 h-3" /> {questions.length} question{questions.length !== 1 ? 's' : ''}
              </span>
              <span className="badge badge-accent inline-flex items-center gap-1">
                <Star className="w-3 h-3" /> {totalPoints} total points
              </span>
              <span className="badge badge-blue inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> {duration} minutes
              </span>
              <span className="badge badge-green inline-flex items-center gap-1">
                <Target className="w-3 h-3" /> {passingScore}% to pass
              </span>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/tests')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Creating...
                </span>
              ) : (
                'Create Test'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTest;
