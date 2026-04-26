import { useState, useEffect } from 'react';
import { Search, Trash2, X, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, BookOpen, Edit3 } from 'lucide-react';
import api from '../../utils/api.js';
import { formatDate } from '../../utils/helpers.js';

const COURSE_STATUSES = ['draft', 'published', 'archived'];

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Delete confirmation
  const [deletingCourse, setDeletingCourse] = useState(null);

  // Status update modal
  const [updatingCourse, setUpdatingCourse] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      const { data } = await api.get('/api/admin/courses', { params });
      setCourses(data.courses || data.data || []);
      setTotalPages(data.pages || data.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [page, statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const openStatusModal = (course) => {
    setUpdatingCourse(course);
    setNewStatus(course.status);
  };

  const saveStatus = async () => {
    if (!updatingCourse || !newStatus) return;
    setSaving(true);
    try {
      await api.put(`/api/admin/courses/${updatingCourse._id}/approve`, {
        status: newStatus === 'archived' ? 'rejected' : 'approved',
      });
      setCourses((prev) =>
        prev.map((c) => (c._id === updatingCourse._id ? { ...c, status: newStatus } : c))
      );
      setUpdatingCourse(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update course');
    } finally {
      setSaving(false);
    }
  };

  const deleteCourse = async () => {
    if (!deletingCourse) return;
    try {
      await api.delete(`/api/admin/courses/${deletingCourse._id}`);
      setCourses((prev) => prev.filter((c) => c._id !== deletingCourse._id));
      setDeletingCourse(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete course');
    }
  };

  const statusBadgeColor = (status) => {
    const map = {
      draft: 'badge-gray',
      published: 'badge-green',
      archived: 'badge-red',
    };
    return map[status] || 'badge-accent';
  };

  const statusBadgeIcon = (status) => {
    return status === 'published' ? (
      <CheckCircle className="w-3 h-3" />
    ) : status === 'archived' ? (
      <AlertCircle className="w-3 h-3" />
    ) : (
      <BookOpen className="w-3 h-3" />
    );
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-txt">Course Management</h1>
          <p className="mt-1 text-txt-muted">Manage all courses on the platform</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-surface-card border-2 border-bdr rounded-2xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by course title..."
                  className="input-field pl-12"
                />
              </div>
              <button type="submit" className="btn-primary">
                Search
              </button>
            </form>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="input-field w-auto"
            >
              <option value="">All Status</option>
              {COURSE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-4">
            <p className="text-xs text-txt-muted font-bold uppercase tracking-wider mb-2">Total Courses</p>
            <p className="text-2xl font-black text-txt">{courses.length}</p>
          </div>
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-4">
            <p className="text-xs text-txt-muted font-bold uppercase tracking-wider mb-2">Published</p>
            <p className="text-2xl font-black text-green-400">
              {courses.filter((c) => c.status === 'published').length}
            </p>
          </div>
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-4">
            <p className="text-xs text-txt-muted font-bold uppercase tracking-wider mb-2">Draft</p>
            <p className="text-2xl font-black text-yellow-400">
              {courses.filter((c) => c.status === 'draft').length}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface-card border-2 border-bdr rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-14 h-14 bg-surface-input border-2 border-bdr rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-7 h-7 text-txt-muted" />
              </div>
              <p className="text-txt-muted">No courses found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface border-b-2 border-bdr">
                    <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">
                      Title
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">
                      Instructor
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">
                      Category
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">
                      Level
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">
                      Enrollments
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">
                      Created
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bdr">
                  {courses.map((course) => (
                    <tr key={course._id} className="hover:bg-surface-input transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {course.thumbnail && (
                            <img
                              src={course.thumbnail}
                              alt={course.title}
                              className="w-8 h-8 rounded object-cover"
                            />
                          )}
                          <span className="font-semibold text-txt truncate max-w-xs">{course.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-txt-secondary">
                        {course.instructor?.firstName} {course.instructor?.lastName}
                      </td>
                      <td className="px-6 py-4 text-sm text-txt-secondary">{course.category}</td>
                      <td className="px-6 py-4 text-sm text-txt-secondary">
                        <span className="inline-block px-2 py-1 bg-blue-400/10 text-blue-400 text-xs rounded capitalize">
                          {course.level}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-txt">
                        {course.totalEnrollments || 0}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openStatusModal(course)}
                          className={`badge ${statusBadgeColor(course.status)} inline-flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity`}
                        >
                          {statusBadgeIcon(course.status)}
                          {course.status}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-txt-muted">
                        {formatDate(course.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openStatusModal(course)}
                            className="p-2 rounded-lg bg-blue-400/10 text-blue-400 hover:bg-blue-400/20 transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingCourse(course)}
                            className="p-2 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4 border-t-2 border-bdr">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost flex items-center gap-1 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                    p === page
                      ? 'bg-yellow-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : 'text-txt-muted hover:text-txt hover:bg-surface-input'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-ghost flex items-center gap-1 disabled:opacity-40"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      {updatingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6 max-w-sm w-full mx-4 animate-scaleIn">
            <h3 className="text-lg font-black text-txt mb-1">Update Course Status</h3>
            <p className="text-sm text-txt-muted mb-5">{updatingCourse.title}</p>
            <div className="space-y-3 mb-6">
              {COURSE_STATUSES.map((status) => (
                <label
                  key={status}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    newStatus === status
                      ? 'border-yellow-400/50 bg-yellow-400/5'
                      : 'border-bdr hover:border-bdr-hover'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={status}
                    checked={newStatus === status}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="accent-yellow-400 w-4 h-4 rounded"
                  />
                  <span className="text-sm font-semibold text-txt-secondary capitalize">
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setUpdatingCourse(null)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={saveStatus} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6 max-w-sm w-full mx-4 animate-scaleIn">
            <div className="w-12 h-12 bg-red-400/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-black text-txt mb-2 text-center">Delete Course?</h3>
            <p className="text-sm text-txt-secondary mb-5 text-center">
              Are you sure you want to delete <strong className="text-txt">{deletingCourse.title}</strong>? This
              action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingCourse(null)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={deleteCourse} className="btn-danger flex-1">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManagement;
