import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  ArrowLeft, Plus, ChevronUp, ChevronDown, Trash2,
  BookOpen, Image, DollarSign, Globe, Layers, GripVertical
} from 'lucide-react';
import api from '../../utils/api.js';
import { COURSE_CATEGORIES, COURSE_LEVELS } from '../../utils/constants.js';
import { validateTitle, validateDescription, validateUrl, validatePrice } from '../../utils/validators.js';
import useAuth from '../../hooks/useAuth.js';

const emptySession = { title: '', videoUrl: '', pdfUrl: '', order: 1 };

const CreateCourse = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const formRef = useRef(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Development',
    level: 'Beginner',
    price: 0,
    thumbnail: '',
    language: 'English',
  });

  const [sessions, setSessions] = useState([{ ...emptySession }]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // GSAP entrance
  useEffect(() => {
    if (formRef.current) {
      gsap.fromTo(formRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' });
    }
  }, []);

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
    setSessions((prev) => [
      ...prev,
      { ...emptySession, order: prev.length + 1 },
    ]);
  };

  const removeSession = (index) => {
    if (sessions.length <= 1) return;
    setSessions((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((s, i) => ({ ...s, order: i + 1 }));
    });
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
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const courseRes = await api.post('/api/courses', form);
      const courseId = courseRes.data.course?._id || courseRes.data._id;

      // Create sessions
      for (const session of sessions) {
        if (session.title.trim()) {
          await api.post(`/api/courses/${courseId}/sessions`, {
            title: session.title,
            videoUrl: session.videoUrl,
            pdfUrl: session.pdfUrl,
            order: session.order,
          });
        }
      }

      navigate(`/courses/${courseId}`);
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to create course');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="border-b border-bdr">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-txt">Create New Course</h1>
            <p className="text-txt-muted mt-1">Share your knowledge with the community</p>
          </div>
          <button onClick={() => navigate(-1)} className="btn-ghost flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Cancel
          </button>
        </div>
      </div>

      <div ref={formRef} className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {submitError && (
                <div className="p-4 bg-red-400/10 border border-red-400/20 rounded-xl">
                  <p className="text-red-400 text-sm">{submitError}</p>
                </div>
              )}

              {/* Course Details Card */}
              <div className="card p-6">
                <h2 className="text-lg font-bold text-txt mb-5 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-yellow-400" />
                  Course Details
                </h2>

                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold text-txt-secondary mb-2">
                      Course Title <span className="text-red-400 ml-1">*</span>
                    </label>
                    <input
                      name="title"
                      placeholder="e.g. Introduction to Web Development"
                      value={form.title}
                      onChange={handleChange}
                      maxLength={150}
                      className={`input-field ${errors.title ? 'border-red-400' : ''}`}
                    />
                    {errors.title && (
                      <p className="text-red-400 text-sm mt-1">{errors.title}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-txt-secondary mb-2">
                      Description <span className="text-red-400 ml-1">*</span>
                    </label>
                    <textarea
                      name="description"
                      rows={5}
                      placeholder="Describe what students will learn in this course..."
                      value={form.description}
                      onChange={handleChange}
                      maxLength={5000}
                      className={`input-field resize-none ${errors.description ? 'border-red-400' : ''}`}
                    />
                    {errors.description && (
                      <p className="text-red-400 text-sm mt-1">{errors.description}</p>
                    )}
                  </div>

                  {/* Category & Level */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-txt-secondary mb-2">Category</label>
                      <select
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                        className="input-field"
                      >
                        {COURSE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-txt-secondary mb-2">Level</label>
                      <select
                        name="level"
                        value={form.level}
                        onChange={handleChange}
                        className="input-field"
                      >
                        {COURSE_LEVELS.map((lvl) => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Price & Language */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-txt-secondary mb-2 flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-yellow-400" />
                        Price ($)
                      </label>
                      <input
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={form.price}
                        onChange={handleChange}
                        className={`input-field ${errors.price ? 'border-red-400' : ''}`}
                      />
                      {errors.price && (
                        <p className="text-red-400 text-sm mt-1">{errors.price}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-txt-secondary mb-2 flex items-center gap-1">
                        <Globe className="w-4 h-4 text-yellow-400" />
                        Language
                      </label>
                      <input
                        name="language"
                        value={form.language}
                        onChange={handleChange}
                        placeholder="English"
                        className="input-field"
                      />
                    </div>
                  </div>

                  {/* Thumbnail */}
                  <div>
                    <label className="block text-sm font-semibold text-txt-secondary mb-2 flex items-center gap-1">
                      <Image className="w-4 h-4 text-yellow-400" />
                      Thumbnail URL
                    </label>
                    <input
                      name="thumbnail"
                      placeholder="https://example.com/image.jpg"
                      value={form.thumbnail}
                      onChange={handleChange}
                      className="input-field"
                    />
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
                    <Plus className="w-4 h-4" />
                    Add Session
                  </button>
                </div>

                <div className="space-y-4">
                  {sessions.map((session, index) => (
                    <div
                      key={index}
                      className="p-5 bg-surface rounded-xl border-2 border-bdr animate-fadeIn"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-yellow-400 flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-txt-muted" />
                          Session {index + 1}
                        </h3>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveSession(index, -1)}
                            disabled={index === 0}
                            className="p-1.5 rounded-lg text-txt-muted hover:text-yellow-400 hover:bg-yellow-400/5 disabled:opacity-30 transition-colors"
                            title="Move up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSession(index, 1)}
                            disabled={index === sessions.length - 1}
                            className="p-1.5 rounded-lg text-txt-muted hover:text-yellow-400 hover:bg-yellow-400/5 disabled:opacity-30 transition-colors"
                            title="Move down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          {sessions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSession(index)}
                              className="p-1.5 rounded-lg text-txt-muted hover:text-red-400 hover:bg-red-400/5 transition-colors ml-1"
                              title="Remove session"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <input
                            placeholder="Session title"
                            value={session.title}
                            onChange={(e) => handleSessionChange(index, 'title', e.target.value)}
                            className={`input-field ${errors[`session_${index}_title`] ? 'border-red-400' : ''}`}
                          />
                          {errors[`session_${index}_title`] && (
                            <p className="text-red-400 text-xs mt-1">
                              {errors[`session_${index}_title`]}
                            </p>
                          )}
                        </div>
                        <input
                          placeholder="Video URL (YouTube, Vimeo, etc.)"
                          value={session.videoUrl}
                          onChange={(e) => handleSessionChange(index, 'videoUrl', e.target.value)}
                          className="input-field"
                        />
                        <input
                          placeholder="PDF URL (optional)"
                          value={session.pdfUrl}
                          onChange={(e) => handleSessionChange(index, 'pdfUrl', e.target.value)}
                          className="input-field"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  className="btn-primary px-8 py-3 text-base"
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    'Create Course'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="btn-secondary px-8 py-3 text-base"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>

          {/* Preview Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <h3 className="text-sm font-bold text-txt-muted uppercase tracking-wide mb-4">
                Preview
              </h3>
              <div className="card overflow-hidden hover:shadow-brutal transition-all duration-300">
                {/* Thumbnail */}
                <div className="h-44 bg-surface border-b border-bdr overflow-hidden flex items-center justify-center">
                  {form.thumbnail ? (
                    <img
                      src={form.thumbnail}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <Image className="w-12 h-12 text-txt-muted" />
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="badge badge-accent">{form.level}</span>
                    <span className="badge badge-blue">{form.category}</span>
                  </div>

                  <h3 className="text-lg font-bold text-txt mb-1.5 line-clamp-1">
                    {form.title || 'Course Title'}
                  </h3>
                  <p className="text-txt-muted text-sm mb-4 line-clamp-2">
                    {form.description || 'Course description will appear here...'}
                  </p>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-black text-yellow-400">
                      {form.price === 0 ? 'Free' : `$${form.price}`}
                    </span>
                    <span className="text-sm text-txt-muted">
                      {sessions.filter((s) => s.title.trim()).length} sessions
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-bdr">
                    <div className="w-6 h-6 rounded-md bg-yellow-400/10 flex items-center justify-center text-yellow-400 text-[10px] font-bold">
                      {(user?.firstName || 'Y')[0]}
                    </div>
                    <span className="text-xs text-txt-secondary">
                      {user?.firstName
                        ? `${user.firstName} ${user.lastName || ''}`
                        : 'You'}
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

export default CreateCourse;
