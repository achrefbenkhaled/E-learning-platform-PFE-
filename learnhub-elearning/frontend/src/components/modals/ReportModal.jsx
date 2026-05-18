import { useState } from 'react';
import { X, AlertTriangle, ShieldAlert } from 'lucide-react';
import api from '../../utils/api.js';

const REPORT_REASONS = ['Harassment', 'Spam', 'Inappropriate Content', 'Hate Speech', 'Other'];

const ReportModal = ({ isOpen, onClose, contentType, contentId, reportedUser, contentSnapshot, metadata }) => {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/api/reports', {
        contentType,
        contentId,
        reportedUser,
        contentSnapshot,
        reason,
        description,
        metadata
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setDescription('');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="card w-full max-w-md overflow-hidden relative animate-scaleIn">
        <div className="p-6 border-b border-bdr flex items-center justify-between bg-surface-hover">
          <div className="flex items-center gap-2 text-red-400">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="font-black uppercase tracking-tight text-lg">Report Content</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface text-txt-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-8 animate-fadeIn">
              <div className="w-16 h-16 bg-green-400/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-green-400/30">
                <ShieldAlert className="w-8 h-8 text-green-400" />
              </div>
              <h4 className="text-xl font-bold text-txt mb-2">Thank You</h4>
              <p className="text-txt-muted">Your report has been submitted for review.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-400/10 border border-red-400/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-txt-muted uppercase tracking-wider px-1">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input-field"
                  required
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-txt-muted uppercase tracking-wider px-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field min-h-[120px] resize-none"
                  placeholder="Tell us more about the issue..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary bg-red-500 text-white border-red-600 hover:bg-red-600 w-full py-3 shadow-[0_4px_0_0_#b91c1c] active:shadow-none active:translate-y-1 mt-2"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
