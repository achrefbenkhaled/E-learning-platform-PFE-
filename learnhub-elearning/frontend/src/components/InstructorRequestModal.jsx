import { useState } from 'react';
import { X, Send, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../utils/api.js';

const InstructorRequestModal = ({ isOpen, onClose, user }) => {
  const [formData, setFormData] = useState({
    name: `${user?.firstName || ''} ${user?.lastName || ''}`,
    email: user?.email || '',
    reason: '',
    experience: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/api/instructor-requests', formData);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        // Optionally refresh page or state
        window.location.reload(); 
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface-card border-2 border-bdr rounded-2xl w-full max-w-lg overflow-hidden animate-scaleIn shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b-2 border-bdr flex items-center justify-between bg-surface">
          <div>
            <h2 className="text-xl font-black text-txt">Become an Instructor</h2>
            <p className="text-sm text-txt-muted">Share your knowledge with the community</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface-hover text-txt-muted hover:text-txt transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {success ? (
            <div className="py-12 text-center animate-bounceIn">
              <div className="w-20 h-20 bg-green-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-2xl font-black text-txt mb-2">Request Submitted!</h3>
              <p className="text-txt-muted px-8">
                Your request is now being reviewed by our team. We'll get back to you soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-txt-muted uppercase tracking-wider ml-1">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="input-field"
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-txt-muted uppercase tracking-wider ml-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="input-field"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-txt-muted uppercase tracking-wider ml-1">Motivation / Reason</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  required
                  rows="3"
                  className="input-field resize-none"
                  placeholder="Why do you want to become an instructor?"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-txt-muted uppercase tracking-wider ml-1">Experience (Optional)</label>
                <textarea
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  rows="2"
                  className="input-field resize-none"
                  placeholder="Tell us about your teaching experience or share a portfolio link"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary flex-1"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Submit Request
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstructorRequestModal;
