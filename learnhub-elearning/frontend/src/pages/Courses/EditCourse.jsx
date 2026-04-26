import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  ArrowLeft, Plus, ChevronUp, ChevronDown, Trash2,
  BookOpen, Image, DollarSign, Globe, Layers, GripVertical, Save,
  ClipboardList, Calendar, ChevronRight, X, CheckCircle, AlertTriangle
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
    title: '', description: '', category: 'Development', level: 'Beginner',
    price: 0, thumbnail: '', language: 'English', status: 'draft',
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
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchCourse = useCallback(async () => {
    try {
      const res = await api.get(`/api/courses/${id}`);
      const { course: courseData, sessions: sessionData } = res.data;
      const c = courseData || res.data;
      setForm({
        title: c.title || '',
        description: c.description || '',
        category: c.category || 'Development',
        level: c.level ? c.level.charAt(0).toUpperCase() + c.level.slice(1) : 'Beginner',
        price: c.price || 0,
        thumbnail: c.thumbnail || '',
        language: c.language || 'English',
        status: c.status || 'draft',
      });
      const sorted = (sessionData || []).sort((a, b) => (a.order || 0) - (b.order || 0));
      setSessions(sorted.map((s) => ({
        _id: s._id,
        title: s.title || '',
        videoUrl: s.videoUrl || '',
        pdfUrl: s.pdfUrl || '',
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'price' ? Number(value) : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSessionChange = (index, field, value) => {
    setSessions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addSession = () => {
    setSessions((prev) => [...prev, { title: '', videoUrl: '', pdfUrl: '', order: prev.length + 1 }]);
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

  const validate = () => {
    const newErrors = {};
    const titleErr = validateTitle(form.title, 150);
    if (titleErr) newErrors.title = titleErr;
    const descErr = validateDescription(form.description, 5000);
    if (descErr) newErrors.description = descErr;
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
      await api.put(`/api/courses/${id}`, form);

      // Delete removed sessions
      for (const sessionId of deletedSessionIds) {
        await api.delete(`/api/courses/${id}/sessions/${sessionId}`);
      }

      // Create or update sessions
      for (const session of sessions) {
        if (session.title.trim()) {
          if (session._id) {
            await api.put(`/api/courses/${id}/sessions/${session._id}`, {
              title: session.title, videoUrl: session.videoUrl, pdfUrl: session.pdfUrl, order: session.order,
            });
          } else {
            await api.post(`/api/courses/${id}/sessions`, {
              title: session.title, videoUrl: session.videoUrl, pdfUrl: session.pdfUrl, order: session.order,
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
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-txt">Edit Course</h1>
            <p className="text-txt-muted mt-1">Update your course details and sessions</p>
          </div>
          <button onClick={() => navigate(`/courses/${id}`)} className="btn-ghost flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Course
          </button>
        </div>
      </div>

      <div ref={formRef} className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    <div>
                      <label className="block text-sm font-semibold text-txt-secondary mb-2">Category</label>
                      <select name="category" value={form.category} onChange={handleChange} className="input-field">
                        {COURSE_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-txt-secondary mb-2">Level</label>
                      <select name="level" value={form.level} onChange={handleChange} className="input-field">
                        {COURSE_LEVELS.map((lvl) => <option key={lvl} value={lvl}>{lvl}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-txt-secondary mb-2 flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-yellow-400" /> Price ($)
                      </label>
                      <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange}
                        className={`input-field ${errors.price ? 'border-red-400' : ''}`} />
                      {errors.price && <p className="text-red-400 text-sm mt-1">{errors.price}</p>}
                    </div>
                    <div>
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
                </div>
              </div>

              {/* Sessions Card */}
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
                        <input placeholder="PDF URL (optional)" value={session.pdfUrl}
                          onChange={(e) => handleSessionChange(index, 'pdfUrl', e.target.value)} className="input-field" />
                      </div>
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <div className="text-center text-txt-muted py-8">
                      No sessions yet. Click "Add Session" to get started.
                    </div>
                  )}
                </div>
              </div>

              {/* Course Tests Card */}
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
                  <div className="space-y-3">
                    {courseTests.map((test) => {
                      const isExpanded = expandedTest === test._id;
                      const windows = test.settings?.scheduleWindows || [];
                      return (
                        <div key={test._id} className="border-2 border-bdr rounded-xl overflow-hidden bg-surface">
                          {/* Test header row */}
                          <div
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-card transition-colors"
                            onClick={() => setExpandedTest(isExpanded ? null : test._id)}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <ChevronRight className={`w-4 h-4 text-txt-muted flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-txt truncate">{test.title}</h4>
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
                                      <div className="text-txt-secondary">
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
                                  <label className="block text-xs font-semibold text-txt-secondary mb-1">Start</label>
                                  <input type="datetime-local" value={newWindow.startTime}
                                    onChange={(e) => setNewWindow(prev => ({ ...prev, startTime: e.target.value }))}
                                    className="input-field py-1.5 text-sm w-full" />
                                </div>
                                <div className="flex-1 w-full">
                                  <label className="block text-xs font-semibold text-txt-secondary mb-1">End</label>
                                  <input type="datetime-local" value={newWindow.endTime}
                                    onChange={(e) => setNewWindow(prev => ({ ...prev, endTime: e.target.value }))}
                                    className="input-field py-1.5 text-sm w-full" />
                                </div>
                                <button type="button" onClick={() => addScheduleWindow(test._id)}
                                  className="btn-primary text-sm px-4 py-2 whitespace-nowrap"
                                  disabled={testActionLoading === test._id || !newWindow.startTime || !newWindow.endTime}>
                                  {testActionLoading === test._id ? 'Adding...' : 'Add Window'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex items-center gap-4">
                <button type="submit" className="btn-primary px-8 py-3 text-base flex items-center gap-2" disabled={submitting}>
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
                <button type="button" onClick={() => navigate(`/courses/${id}`)} className="btn-secondary px-8 py-3 text-base">
                  Cancel
                </button>
              </div>
            </form>
          </div>

          {/* Preview Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <h3 className="text-sm font-bold text-txt-muted uppercase tracking-wide mb-4">Preview</h3>
              <div className="card overflow-hidden hover:shadow-brutal transition-all duration-300">
                <div className="h-44 bg-surface border-b border-bdr overflow-hidden flex items-center justify-center">
                  {form.thumbnail ? (
                    <img src={form.thumbnail} alt="Preview" className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <Image className="w-12 h-12 text-txt-muted" />
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="badge badge-accent">{form.level}</span>
                    <span className="badge badge-blue">{form.category}</span>
                    <span className={`badge ${form.status === 'published' ? 'bg-green-400/10 text-green-400 border-green-400/30' : 'bg-orange-400/10 text-orange-400 border-orange-400/30'}`}>
                      {form.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-txt mb-1.5 line-clamp-1">{form.title || 'Course Title'}</h3>
                  <p className="text-txt-muted text-sm mb-4 line-clamp-2">{form.description || 'Course description...'}</p>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-black text-yellow-400">
                      {form.price === 0 ? 'Free' : `$${form.price}`}
                    </span>
                    <span className="text-sm text-txt-muted">{sessions.length} sessions</span>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-bdr">
                    <div className="w-6 h-6 rounded-md bg-yellow-400/10 flex items-center justify-center text-yellow-400 text-[10px] font-bold">
                      {(user?.firstName || 'Y')[0]}
                    </div>
                    <span className="text-xs text-txt-secondary">
                      {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'You'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCourse;
