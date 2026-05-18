import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, MessageSquare, CheckCircle, XCircle, Trash2, X, ShieldAlert, Eye, MessageCircle, User, AlertTriangle } from 'lucide-react';
import api from '../../utils/api.js';
import { formatDate } from '../../utils/helpers.js';

const ContentModeration = () => {
  const [activeTab, setActiveTab] = useState('courses');
  const [courses, setCourses] = useState([]);
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courseSubTab, setCourseSubTab] = useState('approval'); // 'approval' or 'reports'

  // Fetch data based on active tab
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        if (activeTab === 'courses') {
          const courseRes = await api.get('/api/admin/courses');
          const courseData = courseRes.data?.courses || courseRes.data?.data || courseRes.data;
          setCourses(Array.isArray(courseData) ? courseData : []);

          const reportRes = await api.get('/api/reports');
          const reportData = reportRes.data?.reports || reportRes.data;
          setReports(Array.isArray(reportData) ? reportData : []);
        } else if (activeTab === 'reports' || activeTab === 'userReports') {
          const { data } = await api.get('/api/reports');
          const reportData = data?.reports || data;
          setReports(Array.isArray(reportData) ? reportData : []);
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

  const updateReportStatus = async (reportId, status) => {
    try {
      await api.put(`/api/reports/${reportId}`, { status });
      setReports((prev) =>
        prev.map((r) => (r._id === reportId ? { ...r, status } : r))
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update report');
    }
  };

  const statusBadge = (status) => {
    const map = {
      published: 'badge-green',
      draft: 'badge-accent',
      pending: 'badge-accent',
      rejected: 'badge-red',
      resolved: 'badge-green',
      dismissed: 'badge-gray',
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
        <div className="flex flex-wrap gap-1 bg-surface-card border-2 border-bdr rounded-xl p-1 mb-6 w-fit">
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
            onClick={() => setActiveTab('reports')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'reports'
                ? 'bg-yellow-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'text-txt-muted hover:text-txt'
            }`}
          >
            <ShieldAlert className="w-4 h-4" /> Reported Content
          </button>
          <button
            onClick={() => setActiveTab('userReports')}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'userReports'
                ? 'bg-yellow-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'text-txt-muted hover:text-txt'
            }`}
          >
            <User className="w-4 h-4" /> Reported Users
          </button>
        </div>

        {/* Content */}
        <div className="bg-surface-card border-2 border-bdr rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
            </div>
          ) : activeTab === 'courses' ? (
          <div className="flex flex-col">
            {/* Sub Tabs */}
            <div className="flex gap-4 p-4 border-b border-bdr bg-surface/50">
              <button
                onClick={() => setCourseSubTab('approval')}
                className={`text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${
                  courseSubTab === 'approval'
                    ? 'bg-yellow-400 text-black'
                    : 'text-txt-muted hover:text-txt'
                }`}
              >
                Approval Queue
              </button>
              <button
                onClick={() => setCourseSubTab('reports')}
                className={`text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  courseSubTab === 'reports'
                    ? 'bg-red-400 text-white'
                    : 'text-txt-muted hover:text-txt'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Course Reports
              </button>
            </div>

            {courseSubTab === 'approval' ? (
              (!Array.isArray(courses) || courses.length === 0) ? (
                <div className="text-center py-20">
                  <div className="w-14 h-14 bg-surface-input border-2 border-bdr rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-7 h-7 text-txt-muted" />
                  </div>
                  <p className="text-txt-muted">No courses in approval queue.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-surface border-b-2 border-bdr">
                        <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">Title</th>
                        <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">Instructor</th>
                        <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">Status</th>
                        <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">Date</th>
                        <th className="text-right px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bdr">
                      {courses.map((course) => (
                        <tr key={course._id} className="hover:bg-surface-input transition-colors">
                          <td className="px-6 py-4"><span className="font-semibold text-txt">{course.title}</span></td>
                          <td className="px-6 py-4 text-sm text-txt-secondary">{course.instructor?.name || 'Unknown'}</td>
                          <td className="px-6 py-4"><span className={`badge ${statusBadge(course.status)} capitalize`}>{course.status || 'draft'}</span></td>
                          <td className="px-6 py-4 text-sm text-txt-muted">{formatDate(course.createdAt)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {course.status !== 'published' && (
                                <button onClick={() => approveCourse(course._id)} className="p-2 rounded-lg bg-green-400/10 text-green-400 hover:bg-green-400/20 transition-colors"><CheckCircle className="w-3.5 h-3.5" /></button>
                              )}
                              {course.status !== 'rejected' && (
                                <button onClick={() => rejectCourse(course._id)} className="p-2 rounded-lg bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors"><XCircle className="w-3.5 h-3.5" /></button>
                              )}
                              <button onClick={() => deleteCourse(course._id)} className="p-2 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              /* Course Reports Sub-Tab */
              (!Array.isArray(reports) || reports.filter(r => r?.contentType === 'course').length === 0) ? (
                <div className="text-center py-20">
                  <div className="w-14 h-14 bg-surface-input border-2 border-bdr rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ShieldAlert className="w-7 h-7 text-txt-muted" />
                  </div>
                  <p className="text-txt-muted">No course reports found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-surface border-b-2 border-bdr">
                        <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">Reporter / Course</th>
                        <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">Reason / Details</th>
                        <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">Status</th>
                        <th className="text-right px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bdr">
                      {reports.filter(r => r?.contentType === 'course').map((report) => (
                        <tr key={report._id} className="hover:bg-surface-input transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-txt">By: {report.reporter?.firstName}</span>
                                {report.reporter?._id && (
                                  <Link 
                                    to={`/chat?userId=${report.reporter._id}`}
                                    className="p-1 hover:bg-green-400/10 rounded text-green-400"
                                    title="Message Reporter"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </Link>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Link to={`/courses/${report.contentId}`} className="text-sm font-bold text-yellow-400 hover:underline flex items-center gap-1">
                                  <BookOpen className="w-3.5 h-3.5" />
                                  View Course
                                </Link>
                                <Eye className="w-3.5 h-3.5 text-txt-muted" />
                                {report.reportedUser?._id && (
                                  <Link to={`/chat?userId=${report.reportedUser._id}`} className="p-1 hover:bg-red-400/10 rounded text-red-400 ml-auto" title="Message Instructor">
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </Link>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-bold text-red-400">{report.reason}</span>
                              <div className="p-2 bg-surface rounded-lg border border-bdr text-[10px] italic line-clamp-2">
                                {report.contentSnapshot}
                              </div>
                              <span className="text-xs text-txt-muted italic">"{report.description}"</span>
                            </div>
                          </td>
                          <td className="px-6 py-4"><span className={`badge ${statusBadge(report.status)} capitalize`}>{report.status}</span></td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {report.reportedUser?._id && (
                                <Link 
                                  to={`/chat?userId=${report.reportedUser._id}`}
                                  className="p-2 rounded-lg bg-green-400/10 text-green-400 hover:bg-green-400/20 transition-colors"
                                  title="Message Reported User"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </Link>
                              )}
                              <button onClick={() => updateReportStatus(report._id, 'resolved')} className="p-2 rounded-lg bg-green-400/10 text-green-400"><CheckCircle className="w-3.5 h-3.5" /></button>
                              <button onClick={() => updateReportStatus(report._id, 'dismissed')} className="p-2 rounded-lg bg-gray-400/10 text-txt-muted"><XCircle className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
          ) : activeTab === 'reports' ? (
            /* Reported Content Tab (Posts, Comments, Chats) */
            reports.filter(r => r?.contentType !== 'user' && r?.contentType !== 'course').length === 0 ? (
              <div className="text-center py-20">
                <div className="w-14 h-14 bg-surface-input border-2 border-bdr rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ShieldAlert className="w-7 h-7 text-txt-muted" />
                </div>
                <p className="text-txt-muted">No content reports found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-surface border-b-2 border-bdr">
                      <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">Reporter / Author</th>
                      <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">Reason</th>
                      <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">Type / Content</th>
                      <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">Status</th>
                      <th className="text-right px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bdr">
                    {reports.filter(r => r?.contentType !== 'user' && r?.contentType !== 'course').map((report) => (
                      <tr key={report._id} className="hover:bg-surface-input transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-txt">By: {report.reporter?.firstName}</span>
                              {report.reporter?._id && (
                                <Link to={`/chat?userId=${report.reporter._id}`} className="p-1 hover:bg-green-400/10 rounded text-green-400" title="Message Reporter">
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </Link>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-txt-muted">On: {report.reportedUser?.firstName}</span>
                              {report.reportedUser?._id && (
                                <Link to={`/chat?userId=${report.reportedUser._id}`} className="p-1 hover:bg-red-400/10 rounded text-red-400" title="Message Author">
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </Link>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-red-400">{report.reason}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              {report.contentType === 'course' && <BookOpen className="w-4 h-4 text-amber-400" />}
                              {report.contentType === 'post' && <MessageSquare className="w-4 h-4 text-purple-400" />}
                              {report.contentType === 'comment' && <MessageCircle className="w-4 h-4 text-cyan-400" />}
                              {report.contentType === 'chat' && <MessageCircle className="w-4 h-4 text-green-400" />}
                              <span className="text-[10px] font-black uppercase text-txt-secondary">{report.contentType}</span>
                              {report.contentType === 'course' && (
                                <Link to={`/courses/${report.contentId}`} className="p-1 hover:bg-yellow-400/10 rounded text-yellow-400" title="View Course">
                                  <Eye className="w-3.5 h-3.5" />
                                </Link>
                              )}
                              {report.contentType === 'post' && (
                                <Link to={`/community/${report.contentId}?highlight=${report.contentId}`} className="p-1 hover:bg-yellow-400/10 rounded text-yellow-400" title="View Post">
                                  <Eye className="w-3.5 h-3.5" />
                                </Link>
                              )}
                              {report.contentType === 'comment' && (
                                <Link 
                                  to={report.metadata?.postId ? `/community/${report.metadata.postId}?highlight=${report.contentId}` : '#'} 
                                  className={`p-1 rounded text-yellow-400 ${report.metadata?.postId ? 'hover:bg-yellow-400/10' : 'opacity-50 cursor-not-allowed'}`}
                                  title={report.metadata?.postId ? "View Comment" : "Parent post ID missing"}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Link>
                              )}
                              {report.contentType === 'chat' && (
                                <Link 
                                  to={`/chat?room=${report.metadata?.roomId || 'general'}&highlight=${report.contentId}`} 
                                  className="p-1 hover:bg-yellow-400/10 rounded text-yellow-400"
                                  title="View Message"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Link>
                              )}
                            </div>
                            <div className="p-2 bg-surface rounded-lg border border-bdr text-[10px] italic line-clamp-2">{report.contentSnapshot}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4"><span className={`badge ${statusBadge(report.status)} capitalize`}>{report.status}</span></td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => updateReportStatus(report._id, 'resolved')} className="p-2 rounded-lg bg-green-400/10 text-green-400"><CheckCircle className="w-3.5 h-3.5" /></button>
                            <button onClick={() => updateReportStatus(report._id, 'dismissed')} className="p-2 rounded-lg bg-gray-400/10 text-txt-muted"><XCircle className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* Reported Users Tab */
            reports.filter(r => r?.contentType === 'user').length === 0 ? (
              <div className="text-center py-20">
                <div className="w-14 h-14 bg-surface-input border-2 border-bdr rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <User className="w-7 h-7 text-txt-muted" />
                </div>
                <p className="text-txt-muted">No user reports found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-surface border-b-2 border-bdr">
                      <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">Reporter / Reported User</th>
                      <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">Reason / Details</th>
                      <th className="text-left px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">Status</th>
                      <th className="text-right px-6 py-3 text-xs font-bold text-txt-muted uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bdr">
                    {reports.filter(r => r?.contentType === 'user').map((report) => (
                      <tr key={report._id} className="hover:bg-surface-input transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-txt">By: {report.reporter?.firstName} {report.reporter?.lastName}</span>
                              {report.reporter?._id && (
                                <Link to={`/chat?userId=${report.reporter._id}`} className="p-1 hover:bg-green-400/10 rounded text-green-400" title="Message Reporter">
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </Link>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Link to={`/users/${report.reportedUser?._id}`} className="text-sm font-bold text-yellow-400 hover:underline">
                                Target: {report.reportedUser?.firstName} {report.reportedUser?.lastName}
                              </Link>
                              {report.reportedUser?._id && (
                                <Link to={`/chat?userId=${report.reportedUser._id}`} className="p-1 hover:bg-red-400/10 rounded text-red-400" title="Message Target User">
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </Link>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-red-400">{report.reason}</span>
                            <span className="text-xs text-txt-muted italic">"{report.description}"</span>
                          </div>
                        </td>
                        <td className="px-6 py-4"><span className={`badge ${statusBadge(report.status)} capitalize`}>{report.status}</span></td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => updateReportStatus(report._id, 'resolved')} className="p-2 rounded-lg bg-green-400/10 text-green-400"><CheckCircle className="w-3.5 h-3.5" /></button>
                            <button onClick={() => updateReportStatus(report._id, 'dismissed')} className="p-2 rounded-lg bg-gray-400/10 text-txt-muted"><XCircle className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentModeration;
