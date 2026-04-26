import { useState, useEffect } from 'react';
import { BookOpen, MessageSquare, CheckCircle, XCircle, Trash2, X } from 'lucide-react';
import api from '../../utils/api.js';
import { formatDate } from '../../utils/helpers.js';

const ContentModeration = () => {
  const [activeTab, setActiveTab] = useState('courses');
  const [courses, setCourses] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch data based on active tab
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        if (activeTab === 'courses') {
          const { data } = await api.get('/api/admin/courses');
          setCourses(data.courses || data.data || []);
        } else {
          const { data } = await api.get('/api/admin/moderation');
          setPosts(data.posts || data.data || []);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load content');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab]);

  const approveCourse = async (courseId) => {
    try {
      await api.put(`/api/admin/courses/${courseId}/approve`);
      setCourses((prev) =>
        prev.map((c) => (c._id === courseId ? { ...c, status: 'published' } : c))
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve course');
    }
  };

  const rejectCourse = async (courseId) => {
    try {
      await api.put(`/api/admin/courses/${courseId}/approve`, { status: 'rejected' });
      setCourses((prev) =>
        prev.map((c) => (c._id === courseId ? { ...c, status: 'rejected' } : c))
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject course');
    }
  };

  const deleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      await api.delete(`/api/admin/courses/${courseId}`);
      setCourses((prev) => prev.filter((c) => c._id !== courseId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete course');
    }
  };

  const removePost = async (postId) => {
    if (!window.confirm('Are you sure you want to remove this post?')) return;
    try {
      await api.delete(`/api/admin/moderation/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove post');
    }
  };

  const statusBadge = (status) => {
    const map = {
      published: 'badge-green',
      draft: 'badge-accent',
      pending: 'badge-accent',
      rejected: 'badge-red',
    };
    return map[status] || 'badge-accent';
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-txt">Content Moderation</h1>
          <p className="mt-1 text-txt-muted">Review and moderate platform content</p>
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

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-card border-2 border-bdr rounded-xl p-1 mb-6 w-fit">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'courses'
                ? 'bg-yellow-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'text-txt-muted hover:text-txt'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Courses
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'posts'
                ? 'bg-yellow-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'text-txt-muted hover:text-txt'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Community Posts
          </button>
        </div>

        {/* Content */}
        <div className="bg-surface-card border-2 border-bdr rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
            </div>
          ) : activeTab === 'courses' ? (
            /* Courses Tab */
            courses.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-14 h-14 bg-surface-input border-2 border-bdr rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-7 h-7 text-txt-muted" />
                </div>
                <p className="text-txt-muted">No courses to moderate.</p>
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
                        Status
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">
                        Date
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
                          <span className="font-semibold text-txt">{course.title}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-txt-secondary">
                          {course.instructor?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`badge ${statusBadge(course.status)} capitalize`}>
                            {course.status || 'draft'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-txt-muted">
                          {formatDate(course.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {course.status !== 'published' && (
                              <button
                                onClick={() => approveCourse(course._id)}
                                className="p-2 rounded-lg bg-green-400/10 text-green-400 hover:bg-green-400/20 transition-colors"
                                title="Approve"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {course.status !== 'rejected' && (
                              <button
                                onClick={() => rejectCourse(course._id)}
                                className="p-2 rounded-lg bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors"
                                title="Reject"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteCourse(course._id)}
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
            )
          ) : /* Posts Tab */
          posts.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-14 h-14 bg-surface-input border-2 border-bdr rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-7 h-7 text-txt-muted" />
              </div>
              <p className="text-txt-muted">No posts to moderate.</p>
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
                      Author
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">
                      Category
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bdr">
                  {posts.map((post) => (
                    <tr key={post._id} className="hover:bg-surface-input transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-txt line-clamp-1">
                          {post.title || post.content?.substring(0, 50) || 'Untitled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-txt-secondary">
                        {post.author?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="badge badge-blue capitalize">
                          {post.category || 'general'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-txt-muted">
                        {formatDate(post.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => removePost(post._id)}
                          className="p-2 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentModeration;
