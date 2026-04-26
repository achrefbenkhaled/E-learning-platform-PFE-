import { useState, useEffect } from 'react';
import { Check, X, User, Mail, Calendar, MessageSquare, Briefcase, ExternalLink, Filter } from 'lucide-react';
import api from '../../utils/api.js';
import { formatDate } from '../../utils/helpers.js';

const InstructorRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected
  const [processing, setProcessing] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/instructor-requests/admin');
      setRequests(data);
    } catch (err) {
      setError('Failed to load instructor requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleStatusUpdate = async (id, status) => {
    setProcessing(id);
    try {
      await api.put(`/api/instructor-requests/admin/${id}`, { status });
      setRequests(prev => prev.map(r => r._id === id ? { ...r, status } : r));
    } catch (err) {
      alert('Failed to update request status');
    } finally {
      setProcessing(null);
    }
  };

  const filteredRequests = requests.filter(r => filter === 'all' || r.status === filter);

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-txt">Instructor Requests</h1>
            <p className="text-txt-muted mt-1">Review and manage applications for instructor access</p>
          </div>
          
          <div className="flex items-center gap-2 bg-surface-card border-2 border-bdr p-1 rounded-xl">
            {['all', 'pending', 'approved', 'rejected'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all capitalize ${
                  filter === f 
                    ? 'bg-yellow-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                    : 'text-txt-muted hover:text-txt'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-400/10 border-2 border-red-400/20 rounded-2xl text-red-400 font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-20 bg-surface-card border-2 border-bdr border-dashed rounded-3xl">
            <User className="w-16 h-16 text-txt-muted mx-auto mb-4" />
            <h3 className="text-xl font-bold text-txt">No requests found</h3>
            <p className="text-txt-muted">Applications matching your filter will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredRequests.map((request) => (
              <div 
                key={request._id} 
                className="bg-surface-card border-2 border-bdr rounded-3xl overflow-hidden hover:border-yellow-400/30 transition-all group"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row gap-8">
                    {/* User Info */}
                    <div className="flex-shrink-0 lg:w-64">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 flex items-center justify-center text-yellow-400 font-black text-xl">
                          {request.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-txt leading-tight">{request.name}</h3>
                          <p className="text-xs text-txt-muted flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3" /> {request.email}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-txt-muted bg-surface p-2 rounded-xl border border-bdr/50">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Submitted {formatDate(request.createdAt)}</span>
                        </div>
                        <div className={`text-center py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${
                          request.status === 'pending' ? 'bg-yellow-400/10 text-yellow-400' :
                          request.status === 'approved' ? 'bg-green-400/10 text-green-400' :
                          'bg-red-400/10 text-red-400'
                        }`}>
                          {request.status}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <h4 className="text-xs font-black text-txt-muted uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5" /> Motivation / Reason
                        </h4>
                        <p className="text-txt-secondary text-sm bg-surface p-4 rounded-2xl border border-bdr/50 leading-relaxed">
                          {request.reason}
                        </p>
                      </div>
                      {request.experience && (
                        <div>
                          <h4 className="text-xs font-black text-txt-muted uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5" /> Experience / CV
                          </h4>
                          <p className="text-txt-secondary text-sm bg-surface p-4 rounded-2xl border border-bdr/50">
                            {request.experience}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col justify-end gap-3 lg:w-48">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(request._id, 'approved')}
                            disabled={processing === request._id}
                            className="flex-1 btn-primary bg-green-500 hover:bg-green-600 border-green-700 text-white flex items-center justify-center gap-2 h-12"
                          >
                            <Check className="w-5 h-5" /> Approve
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(request._id, 'rejected')}
                            disabled={processing === request._id}
                            className="flex-1 btn-danger flex items-center justify-center gap-2 h-12"
                          >
                            <X className="w-5 h-5" /> Reject
                          </button>
                        </>
                      )}
                      
                      {request.status !== 'pending' && (
                        <div className="text-sm text-txt-muted italic text-center py-2 flex-1">
                          Decided on {formatDate(request.updatedAt || request.createdAt)}
                        </div>
                      )}

                      <button 
                        className="p-3 rounded-2xl border-2 border-bdr text-txt hover:bg-surface-hover transition-all flex items-center justify-center"
                        title="View Full Profile"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorRequests;
