import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, GraduationCap, MessageSquare, UserCog, Shield, Library, TrendingUp, TrendingDown, FileText, Activity, UserCheck } from 'lucide-react';
import api from '../../utils/api.js';

const statCards = [
  { key: 'totalUsers', label: 'Total Users', icon: Users, color: 'yellow' },
  { key: 'totalStudents', label: 'Total Students', icon: GraduationCap, color: 'green' },
  { key: 'instructors', label: 'Instructors', icon: Activity, color: 'blue' },
  { key: 'totalCourses', label: 'Total Courses', icon: BookOpen, color: 'purple' },
  { key: 'totalTests', label: 'Total Tests', icon: FileText, color: 'pink' },
  { key: 'totalEnrollments', label: 'Total Enrollments', icon: GraduationCap, color: 'cyan' },
  { key: 'totalPosts', label: 'Community Posts', icon: MessageSquare, color: 'purple' },
];

const colorMap = {
  yellow: { bg: 'bg-yellow-400/10', text: 'text-yellow-400', border: 'border-yellow-400/20' },
  purple: { bg: 'bg-purple-400/10', text: 'text-purple-400', border: 'border-purple-400/20' },
  pink: { bg: 'bg-pink-400/10', text: 'text-pink-400', border: 'border-pink-400/20' },
  green: { bg: 'bg-green-400/10', text: 'text-green-400', border: 'border-green-400/20' },
  blue: { bg: 'bg-blue-400/10', text: 'text-blue-400', border: 'border-blue-400/20' },
  cyan: { bg: 'bg-cyan-400/10', text: 'text-cyan-400', border: 'border-cyan-400/20' },
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/api/admin/stats');
        setStats(data.stats || data || {});
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-txt">Admin Dashboard</h1>
          <p className="mt-1 text-txt-muted">Platform overview and comprehensive management</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {statCards.map((card) => {
            const colors = colorMap[card.color];
            const value = stats[card.key] ?? 0;
            const trend = stats[`${card.key}Trend`];
            const Icon = card.icon;
            return (
              <div
                key={card.key}
                className="bg-surface-card border-2 border-bdr rounded-2xl p-6 hover:border-yellow-400/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-6 h-6 ${colors.text}`} />
                  </div>
                  {trend !== undefined && (
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg ${
                        trend >= 0
                          ? 'bg-green-400/10 text-green-400 border border-green-400/20'
                          : 'bg-red-400/10 text-red-400 border border-red-400/20'
                      }`}
                    >
                      {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {trend >= 0 ? '+' : ''}
                      {trend}%
                    </span>
                  )}
                </div>
                <p className="text-3xl font-black text-txt">{value.toLocaleString()}</p>
                <p className="text-sm text-txt-muted mt-1">{card.label}</p>
              </div>
            );
          })}
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* User Management Section */}
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-txt">User Management</h3>
                <p className="text-sm text-txt-muted mt-1">Manage platform users, roles & permissions</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-txt-muted">Total Users</span>
                <span className="font-bold text-txt">{stats.totalUsers || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-txt-muted">Students</span>
                <span className="font-bold text-txt text-green-400">{stats.totalStudents || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-txt-muted">Instructors</span>
                <span className="font-bold text-txt text-blue-400">{stats.instructors || 0}</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin/users')}
              className="w-full btn-primary"
            >
              Manage Users
            </button>
          </div>

          {/* Course Management Section */}
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-txt">Course Management</h3>
                <p className="text-sm text-txt-muted mt-1">Manage all courses & content</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-txt-muted">Total Courses</span>
                <span className="font-bold text-txt">{stats.totalCourses || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-txt-muted">Active Courses</span>
                <span className="font-bold text-txt">{stats.activeCourses || 0}</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin/courses')}
              className="w-full btn-primary"
            >
              Manage Courses
            </button>
          </div>

          {/* Test Management Section */}
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-txt">Test Management</h3>
                <p className="text-sm text-txt-muted mt-1">Manage assessments & quizzes</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-pink-400/10 border border-pink-400/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-pink-400" />
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-txt-muted">Total Tests</span>
                <span className="font-bold text-txt">{stats.totalTests || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-txt-muted">Enrollments</span>
                <span className="font-bold text-txt">{stats.totalEnrollments || 0}</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin/tests')}
              className="w-full btn-primary"
            >
              Manage Tests
            </button>
          </div>

          {/* Content Moderation Section */}
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-txt">Content Moderation</h3>
                <p className="text-sm text-txt-muted mt-1">Review & moderate platform content</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-green-400/10 border border-green-400/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-400" />
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-txt-muted">Community Posts</span>
                <span className="font-bold text-txt">{stats.totalPosts || 0}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-txt-muted">Pending Reports</span>
                <span className={`font-bold ${stats.pendingReports > 0 ? 'text-red-400 animate-pulse' : 'text-txt'}`}>
                  {stats.pendingReports || 0}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin/moderation')}
              className="w-full btn-primary"
            >
              Review Content
            </button>
          </div>

          {/* Instructor Requests Section */}
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-txt">Instructor Requests</h3>
                <p className="text-sm text-txt-muted mt-1">Review and approve teacher applications</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-txt-muted">Manage applicants</span>
                <span className="font-bold text-txt">Active</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin/instructor-requests')}
              className="w-full btn-primary bg-blue-500 hover:bg-blue-600 border-blue-700 text-white"
            >
              View Requests
            </button>
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="bg-gradient-to-r from-yellow-400/10 to-purple-400/10 border-2 border-yellow-400/20 rounded-2xl p-6">
          <h3 className="text-lg font-black text-txt mb-4">Platform Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-black text-yellow-400">{stats.totalUsers || 0}</p>
              <p className="text-xs text-txt-muted mt-1">Total Users</p>
            </div>
            <div>
              <p className="text-2xl font-black text-green-400">{stats.totalStudents || 0}</p>
              <p className="text-xs text-txt-muted mt-1">Students</p>
            </div>
            <div>
              <p className="text-2xl font-black text-purple-400">{stats.totalCourses || 0}</p>
              <p className="text-xs text-txt-muted mt-1">Courses</p>
            </div>
            <div>
              <p className="text-2xl font-black text-pink-400">{stats.totalTests || 0}</p>
              <p className="text-xs text-txt-muted mt-1">Tests</p>
            </div>
            <div>
              <p className="text-2xl font-black text-green-400">{stats.totalEnrollments || 0}</p>
              <p className="text-xs text-txt-muted mt-1">Enrollments</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
