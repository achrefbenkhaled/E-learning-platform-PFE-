import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  ArrowLeft, Plus, ChevronUp, ChevronDown, Trash2,
  BookOpen, Image, DollarSign, Globe, Layers, GripVertical, Save,
  ClipboardList, Calendar, ChevronRight, X, CheckCircle, AlertTriangle, Sparkles, Shield, Clock, HelpCircle, Users, Lock
} from 'lucide-react';
import api from '../../utils/api.js';
import { COURSE_CATEGORIES, COURSE_LEVELS } from '../../utils/constants.js';
import { validateTitle, validateDescription, validateUrl, validatePrice } from '../../utils/validators.js';
import useAuth from '../../hooks/useAuth.js';

const EditCourse = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const formRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: '', description: '', categories: [], level: 'Beginner',
    price: 0, thumbnail: '', language: 'English', status: 'draft',
    finalTestId: '', type: 'standard', classCode: '',
  });
  const [sessions, setSessions] = useState([]);
  const [deletedSessionIds, setDeletedSessionIds] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState('');

  // Tests state
  const [courseTests, setCourseTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(true);
  const [expandedTest, setExpandedTest] = useState(null);
  const [newWindow, setNewWindow] = useState({ startTime: '', endTime: '' });
  const [testActionLoading, setTestActionLoading] = useState(null);

  // Toast notification
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message: '' }
  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Students state
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [blockingStudent, setBlockingStudent] = useState(null);
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'sessions', 'tests', 'students'

  const fetchCourse = useCallback(async () => {
    try {
      const res = await api.get(`/api/courses/${id}`);
      const { course: courseData, sessions: sessionData } = res.data;
      const c = courseData || res.data;
      setForm({
        title: c.title || '',
        description: c.description || '',
        categories: c.categories || (c.category ? [c.category] : []),
        level: c.level ? c.level.charAt(0).toUpperCase() + c.level.slice(1) : 'Beginner',
        price: c.price || 0,
        thumbnail: c.thumbnail || '',
        language: c.language || 'English',
        status: c.status || 'draft',
        finalTestId: c.finalTestId || '',
        type: c.type || 'standard',
        classCode: c.classCode || '',
      });
      const sorted = (sessionData || []).sort((a, b) => (a.order || 0) - (b.order || 0));
      setSessions(sorted.map((s) => ({
        _id: s._id,
        title: s.title || '',
        videoUrl: s.videoUrl || '',
        pdfUrl: s.pdfUrl || '',
        testId: s.testId || '',
        order: s.order || 1,
      })));
    } catch (err) {
      setSubmitError('Failed to load course data');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchCourse(); }, [fetchCourse]);

  const fetchTests = useCallback(async () => {
    try {
      setTestsLoading(true);
      const res = await api.get(`/api/courses/${id}/tests`);
      setCourseTests(res.data || []);
    } catch {
      setCourseTests([]);
    } finally {
      setTestsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  useEffect(() => {
    if (!loading && formRef.current) {
      gsap.fromTo(formRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' });
    }
  }, [loading]);

  const fetchStudents = useCallback(async () => {
    setStudentsLoading(true);
    try {
      const res = await api.get(`/api/courses/${id}/students`);
      setStudents(res.data.students || []);
    } catch (err) {
      showToast('error', 'Failed to fetch students');
    } finally {
      setStudentsLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudents();
    }
  }, [activeTab, fetchStudents]);

  const handleToggleBlock = async (enrollmentId) => {
    setBlockingStudent(enrollmentId);
    try {
      const res = await api.post(`/api/courses/${id}/students/${enrollmentId}/toggle-block`);
      setStudents(prev => prev.map(s => 
        s.enrollmentId === enrollmentId ? { ...s, isBlocked: res.data.isBlocked } : s
      ));
      showToast('success', res.data.isBlocked ? 'Student blocked' : 'Student unblocked');
    } catch (err) {
      showToast('error', 'Failed to toggle block status');
    } finally {
      setBlockingStudent(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'price' ? Number(value) : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleCategoryToggle = (cat) => {
    setForm(prev => {
      const categories = prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat];
      return { ...prev, categories };
    });
    if (errors.categories) setErrors(prev => ({ ...prev, categories: '' }));
  };

  const handleSessionChange = (index, field, value) => {
    setSessions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addSession = () => {
    setSessions((prev) => [...prev, { title: '', videoUrl: '', pdfUrl: '', testId: '', order: prev.length + 1 }]);
  };

  const removeSession = (index) => {
    const session = sessions[index];
    if (session._id) setDeletedSessionIds((prev) => [...prev, session._id]);
    setSessions((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 })));
  };

  const moveSession = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sessions.length) return;
    setSessions((prev) => {
      const updated = [...prev];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  const addScheduleWindow = async (testId) => {
    if (!newWindow.startTime || !newWindow.endTime) return;
    if (new Date(newWindow.endTime) <= new Date(newWindow.startTime)) {
      showToast('error', 'End time must be after start time');
      return;
    }
    setTestActionLoading(testId);
    try {
      const test = courseTests.find(t => t._id === testId);
      const windows = [...(test.settings?.scheduleWindows || []), {
        startTime: new Date(newWindow.startTime).toISOString(),
        endTime: new Date(newWindow.endTime).toISOString(),
      }];
      await api.put(`/api/tests/${testId}`, { settings: { ...test.settings, scheduleWindows: windows } });
      setNewWindow({ startTime: '', endTime: '' });
      await fetchTests();
      showToast('success', 'Schedule window added successfully');
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to add schedule window');
    } finally {
      setTestActionLoading(null);
    }
  };

  const removeScheduleWindow = async (testId, windowIndex) => {
    setTestActionLoading(testId);
    try {
      const test = courseTests.find(t => t._id === testId);
      const windows = (test.settings?.scheduleWindows || []).filter((_, i) => i !== windowIndex);
      await api.put(`/api/tests/${testId}`, { settings: { ...test.settings, scheduleWindows: windows } });
      await fetchTests();
      showToast('success', 'Schedule window removed');
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to remove window');
    } finally {
      setTestActionLoading(null);
    }
  };

  const deleteTest = async (testId) => {
    if (!confirm('Delete this test? This cannot be undone.')) return;
    setTestActionLoading(testId);
    try {
      await api.delete(`/api/tests/${testId}`);
      await fetchTests();
      showToast('success', 'Test deleted successfully');
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to delete test');
    } finally {
      setTestActionLoading(null);
    }
  };

  const [generatingAI, setGeneratingAI] = useState(null); // sessionId or index
  const [aiModal, setAiModal] = useState({ isOpen: false, sessionIndex: null, numQuestions: 5, questionType: 'multiple-choice' });

  const openAiModal = (index) => {
    const session = sessions[index];
    if (!session.pdfUrl) {
      showToast('error', 'Please provide a PDF URL first');
      return;
    }
    setAiModal({ isOpen: true, sessionIndex: index, numQuestions: 5, questionType: 'multiple-choice' });
  };

  const handleGenerateAI = async () => {
    const { sessionIndex, numQuestions, questionType } = aiModal;
    const session = sessions[sessionIndex];
    
    setGeneratingAI(sessionIndex);
    setAiModal({ ...aiModal, isOpen: false });
    
    try {
      const res = await api.post('/api/tests/generate', { 
        pdfUrl: session.pdfUrl,
        numQuestions: Number(numQuestions),
        questionType
      });
      const { questions } = res.data;
      
      navigate(`/tests/create?courseId=${id}`, { 
        state: { 
          generatedQuestions: questions,
          testTitle: `Test: ${session.title}`,
          testDescription: `AI-generated test based on the session: ${session.title}`
        } 
      });
    } catch (err) {
      showToast('error', err.response?.data?.error || 'AI generation failed');
    } finally {
      setGeneratingAI(null);
    }
  };

  const validate = () => {
    const newErrors = {};
    const titleErr = validateTitle(form.title, 150);
    if (titleErr) newErrors.title = titleErr;
    const descErr = validateDescription(form.description, 5000);
    if (descErr) newErrors.description = descErr;
    if (!form.categories || form.categories.length === 0) newErrors.categories = 'Select at least one category';
    const priceErr = validatePrice(form.price);
    if (priceErr) newErrors.price = priceErr;
    if (form.thumbnail) {
      const thumbErr = validateUrl(form.thumbnail);
      if (thumbErr) newErrors.thumbnail = thumbErr;
    }
    sessions.forEach((s, i) => {
      if (!s.title.trim()) newErrors[`session_${i}_title`] = 'Session title is required';
      if (s.videoUrl) {
        const vidErr = validateUrl(s.videoUrl);
        if (vidErr) newErrors[`session_${i}_videoUrl`] = vidErr;
      }
      if (s.pdfUrl) {
        const pdfErr = validateUrl(s.pdfUrl);
        if (pdfErr) newErrors[`session_${i}_pdfUrl`] = pdfErr;
      }
    });
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setSubmitting(true);
    setSubmitError('');
    setSuccess('');

    try {
      await api.put(`/api/courses/${id}`, {
        ...form,
        finalTestId: form.finalTestId || null,
      });

      // Delete removed sessions
      for (const sessionId of deletedSessionIds) {
        await api.delete(`/api/courses/${id}/sessions/${sessionId}`);
      }

      // Create or update sessions
      for (const session of sessions) {
        if (session.title.trim()) {
          if (session._id) {
            await api.put(`/api/courses/${id}/sessions/${session._id}`, {
              title: session.title, 
              videoUrl: session.videoUrl, 
              pdfUrl: session.pdfUrl, 
              testId: session.testId || null,
              order: session.order,
            });
          } else {
            await api.post(`/api/courses/${id}/sessions`, {
              title: session.title, 
              videoUrl: session.videoUrl, 
              pdfUrl: session.pdfUrl, 
              testId: session.testId || null,
              order: session.order,
            });
          }
        }
      }

      setDeletedSessionIds([]);
      showToast('success', 'Course updated successfully!');
      fetchCourse();
    } catch (err) {
      showToast('error', err.response?.data?.error || err.response?.data?.message || 'Failed to update course');
    } finally {
      setSubmitting(false);
    }
  };

  const renderTestItem = (test) => {
    const isExpanded = expandedTest === test._id;
    const windows = test.settings?.scheduleWindows || [];
    const isFinal = test.type === 'final';

    return (
      <div key={test._id} className={`border-2 rounded-xl overflow-hidden bg-surface transition-all ${
        isFinal ? 'border-pink-500/20 hover:border-pink-500/40' : 'border-bdr hover:border-yellow-400/30'
      }`}>
        {/* Test header row */}
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-card transition-colors"
          onClick={() => setExpandedTest(isExpanded ? null : test._id)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <ChevronRight className={`w-4 h-4 text-txt-muted flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-txt truncate">{test.title}</h4>
                {isFinal && (
                  <span className="px-1.5 py-0.5 rounded bg-pink-500 text-white text-[9px] font-black uppercase tracking-tighter">
                    Secure
                  </span>
                )}
              </div>
              <p className="text-xs text-txt-muted">
                {test.questions?.length || 0} questions &middot; {windows.length} schedule window{windows.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`badge text-xs ${test.status === 'published' ? 'bg-green-400/10 text-green-400 border-green-400/30' : 'bg-orange-400/10 text-orange-400 border-orange-400/30'}`}>
              {test.status}
            </span>
            <button type="button" onClick={(e) => { e.stopPropagation(); deleteTest(test._id); }}
              className="p-1.5 rounded-lg text-txt-muted hover:text-red-400 hover:bg-red-400/5 transition-colors"
              disabled={testActionLoading === test._id} title="Delete test">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expanded: schedule windows */}
        {isExpanded && (
          <div className="border-t border-bdr p-4 space-y-4">
            <h5 className="text-sm font-semibold text-txt-secondary flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-yellow-400" /> Schedule Windows
            </h5>

            {windows.length === 0 ? (
              <p className="text-xs text-txt-muted">No schedule windows — test is always accessible.</p>
            ) : (
              <div className="space-y-2">
                {windows.map((w, wi) => (
                  <div key={wi} className="flex items-center justify-between p-3 rounded-lg bg-surface-card border border-bdr text-sm">
                    <div className="text-txt-secondary text-xs sm:text-sm">
                      <span className="font-medium text-txt">{new Date(w.startTime).toLocaleString()}</span>
                      <span className="mx-2 text-txt-muted">&rarr;</span>
                      <span className="font-medium text-txt">{new Date(w.endTime).toLocaleString()}</span>
                    </div>
                    <button type="button" onClick={() => removeScheduleWindow(test._id, wi)}
                      className="p-1 rounded text-txt-muted hover:text-red-400 transition-colors"
                      disabled={testActionLoading === test._id}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add window form */}
            <div className="flex flex-col sm:flex-row items-end gap-3 p-3 rounded-lg bg-yellow-400/5 border border-yellow-400/20">
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-bold text-txt-muted uppercase mb-1">Start</label>
                <input type="datetime-local" value={newWindow.startTime}
                  onChange={(e) => setNewWindow(prev => ({ ...prev, startTime: e.target.value }))}
                  className="input-field py-1.5 text-xs w-full" />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-bold text-txt-muted uppercase mb-1">End</label>
                <input type="datetime-local" value={newWindow.endTime}
                  onChange={(e) => setNewWindow(prev => ({ ...prev, endTime: e.target.value }))}
                  className="input-field py-1.5 text-xs w-full" />
              </div>
              <button type="button" onClick={() => addScheduleWindow(test._id)}
                className="btn-primary text-xs px-4 py-2 whitespace-nowrap"
                disabled={testActionLoading === test._id || !newWindow.startTime || !newWindow.endTime}>
                {testActionLoading === test._id ? 'Adding...' : 'Add Window'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-bdr border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-fadeIn">
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border-2 shadow-brutal ${
            toast.type === 'success'
              ? 'bg-green-400/10 border-green-400/30 text-green-400'
              : 'bg-red-400/10 border-red-400/30 text-red-400'
          }`}>
            {toast.type === 'success'
              ? <CheckCircle className="w-5 h-5 flex-shrink-0" />
              : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
            <span className="text-sm font-semibold">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="border-b border-bdr">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-txt">Edit Course</h1>
            <p className="text-txt-muted mt-1">Update your course details and sessions</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/courses/${id}`)} className="btn-ghost flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              View Course
            </button>
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="border-b border-bdr bg-surface-card sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'details' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-txt-muted hover:text-txt'}`}
            >
              Course Details
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`py-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'sessions' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-txt-muted hover:text-txt'}`}
            >
              Sessions & Content
            </button>
            <button
              onClick={() => setActiveTab('tests')}
              className={`py-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'tests' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-txt-muted hover:text-txt'}`}
            >
              Course Tests
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`py-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'students' ? 'border-yellow-400 text-yellow-400' : 'border-transparent text-txt-muted hover:text-txt'}`}
            >
              Students & Access
            </button>
          </div>
        </div>
      </div>

      <div ref={formRef} className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {activeTab === 'details' && (
            <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn">
              {submitError && (
                <div className="p-4 bg-red-400/10 border border-red-400/20 rounded-xl">
                  <p className="text-red-400 text-sm">{submitError}</p>
                </div>
              )}
              {success && (
                <div className="p-4 bg-green-400/10 border border-green-400/20 rounded-xl">
                  <p className="text-green-400 text-sm">{success}</p>
                </div>
              )}

              {/* Course Details Card */}
              <div className="card p-6">
                <h2 className="text-lg font-bold text-txt mb-5 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-yellow-400" />
                  Course Details
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-txt-secondary mb-2">
                      Course Title <span className="text-red-400 ml-1">*</span>
                    </label>
                    <input name="title" placeholder="e.g. Introduction to Web Development"
                      value={form.title} onChange={handleChange}
                      maxLength={150}
                      className={`input-field ${errors.title ? 'border-red-400' : ''}`} />
                    {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-txt-secondary mb-2">
                      Description <span className="text-red-400 ml-1">*</span>
                    </label>
                    <textarea name="description" rows={5}
                      placeholder="Describe what students will learn..."
                      value={form.description} onChange={handleChange}
                      maxLength={5000}
                      className={`input-field resize-none ${errors.description ? 'border-red-400' : ''}`} />
                    {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-semibold text-txt-secondary mb-3">Categories</label>
                      <div className="flex flex-wrap gap-2">
                        {COURSE_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => handleCategoryToggle(cat)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                              form.categories.includes(cat)
                                ? 'bg-yellow-400 border-black text-black shadow-brutal-sm'
                                : 'bg-surface border-bdr text-txt-muted hover:border-txt-secondary'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      {errors.categories && <p className="text-red-400 text-sm mt-2">{errors.categories}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-txt-secondary mb-2">Level</label>
                      <select name="level" value={form.level} onChange={handleChange} className="input-field">
                        {COURSE_LEVELS.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {form.type !== 'classroom' && (
                      <div>
                        <label className="block text-sm font-semibold text-txt-secondary mb-2 flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-yellow-400" /> Price ($)
                        </label>
                        <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange}
                          className={`input-field ${errors.price ? 'border-red-400' : ''}`} />
                        {errors.price && <p className="text-red-400 text-sm mt-1">{errors.price}</p>}
                      </div>
                    )}
                    <div className={form.type === 'classroom' ? 'md:col-span-2' : ''}>
                      <label className="block text-sm font-semibold text-txt-secondary mb-2 flex items-center gap-1">
                        <Globe className="w-4 h-4 text-yellow-400" /> Language
                      </label>
                      <input name="language" value={form.language} onChange={handleChange} className="input-field" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-txt-secondary mb-2 flex items-center gap-1">
                      <Image className="w-4 h-4 text-yellow-400" /> Thumbnail URL
                    </label>
                    <input name="thumbnail" value={form.thumbnail} onChange={handleChange}
                      placeholder="https://example.com/image.jpg" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-txt-secondary mb-2">Status</label>
                    <select name="status" value={form.status} onChange={handleChange} className="input-field">
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>

                  {/* Course Type (Read-only in edit for now, or changeable) */}
                  <div className="p-4 bg-surface rounded-xl border-2 border-bdr">
                    <label className="block text-sm font-semibold text-txt-secondary mb-3">Course Access Type</label>
                    <div className="flex items-center gap-4">
                      <div className={`flex-1 p-3 rounded-lg border-2 flex items-center gap-3 ${form.type === 'standard' ? 'border-yellow-400 bg-yellow-400/5' : 'border-bdr opacity-50'}`}>
                        <Globe className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-bold">Standard</span>
                      </div>
                      <div className={`flex-1 p-3 rounded-lg border-2 flex items-center gap-3 ${form.type === 'classroom' ? 'border-yellow-400 bg-yellow-400/5' : 'border-bdr opacity-50'}`}>
                        <Users className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-bold">Classroom</span>
                      </div>
                    </div>
                    {form.type === 'classroom' && form.classCode && (
                      <div className="mt-4 p-4 bg-yellow-400/5 rounded-xl border border-yellow-400/20 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-txt-muted uppercase tracking-widest">Class Access Code</p>
                          <p className="text-xl font-black text-yellow-400 tracking-widest">{form.classCode}</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(form.classCode);
                            showToast('success', 'Class code copied to clipboard!');
                          }}
                          className="btn-secondary py-2 px-4 text-xs flex items-center gap-2"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                          Copy Code
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Final Exam Designation - Moved into details tab */}
              <div className="card p-6 border-2 border-pink-500/20 bg-pink-500/5">
                <h2 className="text-lg font-bold text-txt mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-pink-500" />
                  Course Final Exam
                </h2>
                <div className="space-y-4">
                  <p className="text-sm text-txt-secondary leading-relaxed">
                    Select the definitive exam for this course. This test will be required for course completion and <span className="text-pink-500 font-bold underline">must</span> be an anti-cheat enabled "Final Exam" type.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-txt-muted uppercase mb-2">Designate Final Exam</label>
                    <select
                      value={form.finalTestId}
                      onChange={(e) => setForm(prev => ({ ...prev, finalTestId: e.target.value }))}
                      className="input-field border-pink-500/30 focus:border-pink-500"
                    >
                      <option value="">No final exam designated</option>
                      {courseTests.filter(t => t.type === 'final').map(test => (
                        <option key={test._id} value={test._id}>
                          {test.title} (Requires Anti-Cheat)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" className="btn-primary px-10 py-3 text-base flex items-center gap-2" disabled={submitting}>
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Details
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-txt flex items-center gap-2">
                    <Layers className="w-5 h-5 text-yellow-400" />
                    Sessions ({sessions.length})
                  </h2>
                  <button type="button" onClick={addSession} className="btn-secondary flex items-center gap-1.5 text-sm">
                    <Plus className="w-4 h-4" /> Add Session
                  </button>
                </div>
                <div className="space-y-4">
                  {sessions.map((session, index) => (
                    <div key={session._id || `new-${index}`}
                      className="p-5 bg-surface rounded-xl border-2 border-bdr animate-fadeIn">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-yellow-400 flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-txt-muted" />
                          Session {index + 1}
                          {session._id && <span className="text-xs text-txt-muted font-normal ml-1">(existing)</span>}
                        </h3>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => moveSession(index, -1)} disabled={index === 0}
                            className="p-1.5 rounded-lg text-txt-muted hover:text-yellow-400 hover:bg-yellow-400/5 disabled:opacity-30 transition-colors" title="Move up">
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => moveSession(index, 1)} disabled={index === sessions.length - 1}
                            className="p-1.5 rounded-lg text-txt-muted hover:text-yellow-400 hover:bg-yellow-400/5 disabled:opacity-30 transition-colors" title="Move down">
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => removeSession(index)}
                            className="p-1.5 rounded-lg text-txt-muted hover:text-red-400 hover:bg-red-400/5 transition-colors ml-1" title="Remove session">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <input placeholder="Session title" value={session.title}
                            onChange={(e) => handleSessionChange(index, 'title', e.target.value)}
                            className={`input-field ${errors[`session_${index}_title`] ? 'border-red-400' : ''}`} />
                          {errors[`session_${index}_title`] && (
                            <p className="text-red-400 text-xs mt-1">{errors[`session_${index}_title`]}</p>
                          )}
                        </div>
                        <input placeholder="Video URL (YouTube, Vimeo, etc.)" value={session.videoUrl}
                          onChange={(e) => handleSessionChange(index, 'videoUrl', e.target.value)} className="input-field" />
                        <div className="flex gap-2">
                          <input placeholder="PDF URL (Google Drive, etc.)" value={session.pdfUrl}
                            onChange={(e) => handleSessionChange(index, 'pdfUrl', e.target.value)} className="input-field flex-1" />
                          <button
                            type="button"
                            onClick={() => openAiModal(index)}
                            disabled={!session.pdfUrl || generatingAI === index}
                            className={`px-4 rounded-xl border-2 font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
                              session.pdfUrl 
                                ? 'bg-yellow-400 border-black text-black hover:shadow-brutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none' 
                                : 'bg-surface border-bdr text-txt-muted cursor-not-allowed'
                            }`}
                          >
                            {generatingAI === index ? (
                              <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3" />
                            )}
                            Generate Test
                          </button>
                        </div>
                        
                        {/* Test Selection */}
                        <div className="pt-2 border-t border-bdr mt-2">
                          <label className="block text-[10px] font-bold text-txt-muted uppercase mb-1">Link Test to Session (Prerequisite for next session)</label>
                          <select 
                            value={session.testId || ''} 
                            onChange={(e) => handleSessionChange(index, 'testId', e.target.value)}
                            className="input-field py-1.5 text-xs"
                          >
                            <option value="">No test required</option>
                            <optgroup label="Practice Quizzes">
                              {courseTests.filter(t => t.type !== 'final').map(test => (
                                <option key={test._id} value={test._id}>{test.title}</option>
                              ))}
                            </optgroup>
                            <optgroup label="Final Exams (Proctored)">
                              {courseTests.filter(t => t.type === 'final').map(test => (
                                <option key={test._id} value={test._id}>{test.title} (Secure)</option>
                              ))}
                            </optgroup>
                          </select>
                          <p className="text-[10px] text-txt-muted mt-1 italic">
                            * Students must pass this test to view Session {index + 2}.
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <div className="text-center text-txt-muted py-8">
                      No sessions yet. Click "Add Session" to get started.
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end mt-8">
                  <button onClick={handleSubmit} className="btn-primary px-10 py-3 text-base flex items-center gap-2" disabled={submitting}>
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save Session Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tests' && (
            <div className="animate-fadeIn space-y-6">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-txt flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-yellow-400" />
                    Course Tests ({courseTests.length})
                  </h2>
                  <button type="button" onClick={() => navigate(`/tests/create?courseId=${id}`)}
                    className="btn-secondary flex items-center gap-1.5 text-sm">
                    <Plus className="w-4 h-4" /> Add Test
                  </button>
                </div>

                {testsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-bdr border-t-yellow-400 rounded-full animate-spin" />
                  </div>
                ) : courseTests.length === 0 ? (
                  <div className="text-center text-txt-muted py-8">
                    No tests yet. Click "Add Test" to create one for this course.
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Final Exams Section */}
                    {courseTests.filter(t => t.type === 'final').length > 0 && (
                      <div className="animate-fadeIn">
                        <div className="flex items-center gap-2 mb-3 px-1">
                          <Shield className="w-4 h-4 text-pink-500" />
                          <h3 className="text-xs font-black text-txt uppercase tracking-tight">Final Exams</h3>
                        </div>
                        <div className="space-y-3">
                          {courseTests.filter(t => t.type === 'final').map((test) => renderTestItem(test))}
                        </div>
                      </div>
                    )}

                    {/* Quizzes Section */}
                    <div className="animate-fadeIn">
                      <div className="flex items-center gap-2 mb-3 px-1">
                        <HelpCircle className="w-4 h-4 text-yellow-400" />
                        <h3 className="text-xs font-black text-txt uppercase tracking-tight">Practice Quizzes</h3>
                      </div>
                      <div className="space-y-3">
                        {courseTests.filter(t => t.type !== 'final').length > 0 ? (
                          courseTests.filter(t => t.type !== 'final').map((test) => renderTestItem(test))
                        ) : (
                          <div className="p-6 border-2 border-dashed border-bdr rounded-xl text-center bg-surface-hover">
                            <p className="text-xs text-txt-muted italic">No practice quizzes found.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="animate-fadeIn space-y-6">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-txt flex items-center gap-2">
                    <Users className="w-5 h-5 text-yellow-400" />
                    Enrolled Students ({students.length})
                  </h2>
                  <button type="button" onClick={fetchStudents} className="btn-secondary text-xs py-2 px-4">
                    Refresh List
                  </button>
                </div>

                {studentsLoading ? (
                  <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-[3px] border-bdr border-t-yellow-400 rounded-full animate-spin" />
                  </div>
                ) : students.length === 0 ? (
                  <div className="text-center py-20 bg-surface rounded-2xl border-2 border-dashed border-bdr">
                    <Users className="w-12 h-12 text-txt-muted mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-txt">No Students Yet</h3>
                    <p className="text-txt-muted">Students will appear here once they enroll in your course.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {students.map(student => (
                      <div key={student.enrollmentId} className="p-4 bg-surface rounded-xl border-2 border-bdr flex items-center justify-between group hover:border-yellow-400/30 transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          {student.avatar ? (
                            <img src={student.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-yellow-400/10 flex items-center justify-center text-yellow-400 font-bold border border-yellow-400/20">
                              {student.firstName?.[0] || 'S'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-txt text-sm truncate">{student.firstName} {student.lastName}</p>
                            <p className="text-[10px] text-txt-muted truncate mb-1">{student.email}</p>
                            <div className="flex gap-2">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-card border border-bdr text-txt-secondary">
                                {student.progress}% Progress
                              </span>
                              {student.isBlocked && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-400/10 text-red-400 border border-red-400/20 flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5" /> Blocked
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleBlock(student.enrollmentId)}
                          disabled={blockingStudent === student.enrollmentId}
                          className={`p-2 rounded-lg transition-all ${
                            student.isBlocked 
                              ? 'bg-red-400/10 text-red-400 border border-red-400/20' 
                              : 'bg-surface-card text-txt-muted hover:text-yellow-400 border border-bdr hover:border-yellow-400/30'
                          }`}
                        >
                          {blockingStudent === student.enrollmentId ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Lock className={`w-4 h-4 ${student.isBlocked ? 'fill-current' : ''}`} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Configuration Modal */}
      {aiModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6 w-full max-w-sm shadow-brutal animate-scaleIn">
            <h3 className="text-xl font-black text-txt mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              Generate Test with AI
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-txt-secondary mb-2">
                  Number of Questions
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={aiModal.numQuestions}
                  onChange={(e) => setAiModal({ ...aiModal, numQuestions: e.target.value })}
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-txt-secondary mb-2">
                  Question Type
                </label>
                <select
                  value={aiModal.questionType}
                  onChange={(e) => setAiModal({ ...aiModal, questionType: e.target.value })}
                  className="input-field"
                >
                  <option value="multiple-choice">Multiple Choice</option>
                  <option value="short-answer">Short Answer</option>
                  <option value="mixed">Mixed (Both)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAiModal({ ...aiModal, isOpen: false })}
                className="btn-secondary px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateAI}
                className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditCourse;
