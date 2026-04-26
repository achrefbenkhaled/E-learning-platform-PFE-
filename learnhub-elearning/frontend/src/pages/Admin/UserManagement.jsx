import { useState, useEffect } from 'react';
import { Search, Edit3, Trash2, UserCheck, UserX, X, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import api from '../../utils/api.js';
import { formatDate } from '../../utils/helpers.js';

const ROLES = ['student', 'instructor', 'admin'];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Edit modal state
  const [editingUser, setEditingUser] = useState(null);
  const [editRoles, setEditRoles] = useState([]);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deletingUser, setDeletingUser] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const { data } = await api.get('/api/admin/users', { params });
      setUsers(data.users || data.data || []);
      setTotalPages(data.totalPages || data.pages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditRoles(user.roles || []);
  };

  const toggleEditRole = (role) => {
    setEditRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const saveRoles = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await api.put(`/api/admin/users/${editingUser._id}`, { roles: editRoles });
      setUsers((prev) =>
        prev.map((u) => (u._id === editingUser._id ? { ...u, roles: editRoles } : u))
      );
      setEditingUser(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const toggleUserStatus = async (user) => {
    const newStatus = user.isActive === false ? true : false;
    try {
      await api.put(`/api/admin/users/${user._id}`, { isActive: newStatus });
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, isActive: newStatus } : u))
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const deleteUser = async () => {
    if (!deletingUser) return;
    try {
      await api.delete(`/api/admin/users/${deletingUser._id}`);
      setUsers((prev) => prev.filter((u) => u._id !== deletingUser._id));
      setDeletingUser(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const roleBadgeColor = (role) => {
    const map = {
      admin: 'badge-red',
      instructor: 'badge-blue',
      student: 'badge-green',
    };
    return map[role] || 'badge-accent';
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-txt">User Management</h1>
          <p className="mt-1 text-txt-muted">Manage platform users and their roles</p>
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
                  placeholder="Search by name or email..."
                  className="input-field pl-12"
                />
              </div>
              <button
                type="submit"
                className="btn-primary"
              >
                Search
              </button>
            </form>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="input-field w-auto"
            >
              <option value="">All Roles</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
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
          ) : users.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-14 h-14 bg-surface-input border-2 border-bdr rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-txt-muted" />
              </div>
              <p className="text-txt-muted">No users found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface border-b-2 border-bdr">
                    <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">
                      Roles
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bdr">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-surface-input transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-yellow-400/10 flex items-center justify-center text-sm font-bold text-yellow-400">
                            {user.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span className="font-semibold text-txt">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-txt-secondary">{user.email}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(user.roles || []).map((role) => (
                            <span
                              key={role}
                              className={`badge ${roleBadgeColor(role)}`}
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-txt-muted">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        {user.isActive === false ? (
                          <span className="badge badge-red">Inactive</span>
                        ) : (
                          <span className="badge badge-green">Active</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 rounded-lg bg-blue-400/10 text-blue-400 hover:bg-blue-400/20 transition-colors"
                            title="Edit Role"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleUserStatus(user)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.isActive === false
                                ? 'bg-green-400/10 text-green-400 hover:bg-green-400/20'
                                : 'bg-amber-400/10 text-amber-400 hover:bg-amber-400/20'
                            }`}
                            title={user.isActive === false ? 'Activate' : 'Deactivate'}
                          >
                            {user.isActive === false ? (
                              <UserCheck className="w-3.5 h-3.5" />
                            ) : (
                              <UserX className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => setDeletingUser(user)}
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
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

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6 max-w-sm w-full mx-4 animate-scaleIn">
            <h3 className="text-lg font-black text-txt mb-1">Edit Roles</h3>
            <p className="text-sm text-txt-muted mb-5">{editingUser.name}</p>
            <div className="space-y-3 mb-6">
              {ROLES.map((role) => (
                <label
                  key={role}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    editRoles.includes(role)
                      ? 'border-yellow-400/50 bg-yellow-400/5'
                      : 'border-bdr hover:border-bdr-hover'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={editRoles.includes(role)}
                    onChange={() => toggleEditRole(role)}
                    className="accent-yellow-400 w-4 h-4 rounded"
                  />
                  <span className="text-sm font-semibold text-txt-secondary capitalize">
                    {role}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={saveRoles}
                disabled={saving || editRoles.length === 0}
                className="btn-primary flex-1"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6 max-w-sm w-full mx-4 animate-scaleIn">
            <div className="w-12 h-12 bg-red-400/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-black text-txt mb-2 text-center">Delete User?</h3>
            <p className="text-sm text-txt-secondary mb-5 text-center">
              Are you sure you want to delete <strong className="text-txt">{deletingUser.name}</strong>? This
              action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingUser(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={deleteUser}
                className="btn-danger flex-1"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
