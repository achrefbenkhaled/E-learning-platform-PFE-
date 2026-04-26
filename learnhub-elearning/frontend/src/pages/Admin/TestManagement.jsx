import { useState, useEffect } from 'react';
import { Search, Trash2, X, ChevronLeft, ChevronRight, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import api from '../../utils/api.js';
import { formatDate } from '../../utils/helpers.js';

const TEST_STATUSES = ['draft', 'published', 'archived'];

const TestManagement = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Delete confirmation
  const [deletingTest, setDeletingTest] = useState(null);

  // Status update modal
  const [updatingTest, setUpdatingTest] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/api/admin/tests', { params });
      setTests(data.tests || data.data || []);
      setTotalPages(data.pages || data.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, [page, statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    // Apply search filter manually if needed
  };

  const openStatusModal = (test) => {
    setUpdatingTest(test);
    setNewStatus(test.status);
  };

  const saveStatus = async () => {
    if (!updatingTest || !newStatus) return;
    setSaving(true);
    try {
      await api.put(`/api/admin/tests/${updatingTest._id}`, { status: newStatus });
      setTests((prev) =>
        prev.map((t) => (t._id === updatingTest._id ? { ...t, status: newStatus } : t))
      );
      setUpdatingTest(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update test');
    } finally {
      setSaving(false);
    }
  };

  const deleteTest = async () => {
    if (!deletingTest) return;
    try {
      await api.delete(`/api/admin/tests/${deletingTest._id}`);
      setTests((prev) => prev.filter((t) => t._id !== deletingTest._id));
      setDeletingTest(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete test');
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
      <FileText className="w-3 h-3" />
    );
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-txt">Test Management</h1>
          <p className="mt-1 text-txt-muted">Manage all tests and assessments on the platform</p>
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
                  placeholder="Search by test title..."
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
              {TEST_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface-card border-2 border-bdr rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
            </div>
          ) : tests.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-14 h-14 bg-surface-input border-2 border-bdr rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-txt-muted" />
              </div>
              <p className="text-txt-muted">No tests found.</p>
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
                      Created By
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">
                      Course
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">
                      Questions
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
                  {tests.map((test) => (
                    <tr key={test._id} className="hover:bg-surface-input transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-400/10 flex items-center justify-center text-xs">
                            <FileText className="w-4 h-4 text-blue-400" />
                          </div>
                          <span className="font-semibold text-txt truncate max-w-xs">{test.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-txt-secondary">
                        {test.createdBy?.firstName} {test.createdBy?.lastName}
                      </td>
                      <td className="px-6 py-4 text-sm text-txt-secondary">
                        {test.courseId?.title || 'Standalone'}
                      </td>
                      <td className="px-6 py-4 text-sm text-txt-secondary">
                        {test.questions?.length || 0}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openStatusModal(test)}
                          className={`badge ${statusBadgeColor(test.status)} inline-flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity`}
                        >
                          {statusBadgeIcon(test.status)}
                          {test.status}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-txt-muted">
                        {formatDate(test.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setDeletingTest(test)}
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
      {updatingTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6 max-w-sm w-full mx-4 animate-scaleIn">
            <h3 className="text-lg font-black text-txt mb-1">Update Test Status</h3>
            <p className="text-sm text-txt-muted mb-5">{updatingTest.title}</p>
            <div className="space-y-3 mb-6">
              {TEST_STATUSES.map((status) => (
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
                    {status}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setUpdatingTest(null)} className="btn-secondary flex-1">
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
      {deletingTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6 max-w-sm w-full mx-4 animate-scaleIn">
            <div className="w-12 h-12 bg-red-400/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-black text-txt mb-2 text-center">Delete Test?</h3>
            <p className="text-sm text-txt-secondary mb-5 text-center">
              Are you sure you want to delete <strong className="text-txt">{deletingTest.title}</strong>? This
              action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingTest(null)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={deleteTest} className="btn-danger flex-1">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestManagement;
