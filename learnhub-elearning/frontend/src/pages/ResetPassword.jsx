import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft, Save, CheckCircle, AlertTriangle } from 'lucide-react';
import api from '../utils/api.js';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // No token in URL = invalid access
  if (!token) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center rotate-[-3deg] shadow-lg shadow-indigo-500/20">
                <span className="text-white font-black text-lg">L</span>
              </div>
              <span className="text-2xl font-black text-txt">Learn<span className="text-indigo-600">Hub</span></span>
            </div>
          </div>
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-red-400/10 border-2 border-red-400/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-black text-txt mb-2">Invalid Reset Link</h1>
            <p className="text-txt-muted mb-6">
              This password reset link is invalid or has already been used.
              Please request a new one.
            </p>
            <Link to="/forgot-password" className="btn-primary inline-flex items-center gap-2 px-6 py-3">
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Both password fields are required');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', {
        token,
        newPassword,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center rotate-[-3deg] shadow-lg shadow-indigo-500/20">
                <span className="text-white font-black text-lg">L</span>
              </div>
              <span className="text-2xl font-black text-txt">Learn<span className="text-indigo-600">Hub</span></span>
            </div>
          </div>
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-green-400/10 border-2 border-green-400/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-black text-txt mb-2">Password Reset!</h1>
            <p className="text-txt-muted mb-6">
              Your password has been changed successfully. You can now sign in with your new password.
            </p>
            <Link to="/login" className="btn-primary inline-flex items-center gap-2 px-6 py-3">
              <ArrowLeft className="w-4 h-4" /> Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center rotate-[-3deg] shadow-lg shadow-indigo-500/20">
              <span className="text-white font-black text-lg">L</span>
            </div>
            <span className="text-2xl font-black text-txt">Learn<span className="text-indigo-600">Hub</span></span>
          </div>
        </div>

        <div className="card p-8">
          <h1 className="text-2xl font-black text-txt mb-1 text-center">Create New Password</h1>
          <p className="text-txt-muted text-center mb-6">
            Enter your new password below
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-txt-secondary mb-2">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-12"
                  autoFocus
                />
              </div>
              <p className="text-xs text-txt-muted mt-1">Minimum 6 characters</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-txt-secondary mb-2">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-12"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Resetting...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> Reset Password
                </span>
              )}
            </button>
          </form>

          <p className="text-center text-txt-muted mt-6">
            <Link to="/login" className="text-indigo-600 hover:text-indigo-500 font-semibold inline-flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
