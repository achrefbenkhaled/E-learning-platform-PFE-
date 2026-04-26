import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

  // Check if user is instructor
  useEffect(() => {
    if (!isLoading && (!user || !user.roles?.includes('instructor'))) {
      setError('Only instructors can create tests. Please contact an administrator to upgrade your account.');
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
  const [requireCamera, setRequireCamera] = useState(false);
  const [requireAntiCheat, setRequireAntiCheat] = useState(false);

  // Questions
  const [questions, setQuestions] = useState([emptyQuestion()]);

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
      courseId: courseId || undefined,
      settings: {
        duration: Number(duration),
        passingScore: Number(passingScore),
        shuffleQuestions,
        showResults,
        requireCamera,
        requireAntiCheat,
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
      navigate(courseId ? `/courses/${courseId}/edit` : '/tests');
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
                  onChange={(e) => setDuration(e.target.value)}
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
                  onChange={(e) => setScheduledStartTime(e.target.value)}
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
                  onChange={(e) => setScheduledEndTime(e.target.value)}
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
                  <Eye className="w-4 h-4 text-txt-muted" />
                  <span className="text-sm text-txt-secondary">Show results to students after submission</span>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setRequireCamera(!requireCamera)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    requireCamera ? 'bg-yellow-400' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform ${
                      requireCamera ? 'translate-x-5 bg-black' : 'bg-gray-400'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-txt-muted" />
                  <span className="text-sm text-txt-secondary">Require camera (anti-cheat)</span>
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
