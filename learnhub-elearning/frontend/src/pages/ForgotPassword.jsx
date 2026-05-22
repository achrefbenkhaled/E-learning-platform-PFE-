import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import emailjs from '@emailjs/browser';
import api from '../utils/api.js';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Ask the backend to generate a secure reset token
      const { data } = await api.post('/api/auth/forgot-password', { email: email.trim() });

      // If the backend returned a token, the user exists - send the email
      if (data.resetToken) {
        const frontendUrl = window.location.origin;
        const resetLink = `${frontendUrl}/reset-password?token=${data.resetToken}`;

        // Step 2: Send the email via EmailJS using your template
        await emailjs.send(
          import.meta.env.VITE_EMAILJS_SERVICE_ID,
          import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
          {
            to_email: data.userEmail,
            to_name: data.userName,
            resetLink: resetLink,
            reset_link: resetLink,
          },
          import.meta.env.VITE_EMAILJS_PUBLIC_KEY
        );
      }

      // Always show success (even if user not found, for security)
      setSent(true);
    } catch (err) {
      console.error('Forgot password error:', err);
      const msg = err?.text || err?.message || err?.response?.data?.error || 'Failed to send reset email. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
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
            <h1 className="text-2xl font-black text-txt mb-2">Check Your Email</h1>
            <p className="text-txt-muted mb-6">
              We've sent a password reset link to <strong className="text-txt">{email}</strong>.
              The link will expire in <strong className="text-txt">60 minutes</strong>.
            </p>
            <p className="text-sm text-txt-muted mb-8">
              If you don't see the email, check your spam folder.
            </p>
            <Link to="/login" className="btn-primary inline-flex items-center gap-2 px-6 py-3">
              <ArrowLeft className="w-4 h-4" /> Back to Login
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
          <h1 className="text-2xl font-black text-txt mb-1 text-center">Forgot Password?</h1>
          <p className="text-txt-muted text-center mb-6">
            Enter your email and we'll send you a link to reset your password
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-txt-secondary mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field pl-12"
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Send Reset Link
                </span>
              )}
            </button>
          </form>

          <p className="text-center text-txt-muted mt-6">
            Remember your password?{' '}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-500 font-semibold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
