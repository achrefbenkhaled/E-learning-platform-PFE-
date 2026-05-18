import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, User } from 'lucide-react';
import useAuthStore from '../context/authStore.js';
import { useGoogleLogin } from '@react-oauth/google';
import { validateEmail, validatePassword, validateName } from '../utils/validators.js';

export const Register = () => {
  const navigate = useNavigate();
  const { register, googleLogin, isLoading, error } = useAuthStore();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    reason: '',
    experience: '',
  });
  const [files, setFiles] = useState({
    idCard: null,
    cv: null,
    diploma: null,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const { name, files: uploadedFiles } = e.target;
    setFiles((prev) => ({ ...prev, [name]: uploadedFiles[0] }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    const fnErr = validateName(formData.firstName, 'First name');
    if (fnErr) newErrors.firstName = fnErr;
    const lnErr = validateName(formData.lastName, 'Last name');
    if (lnErr) newErrors.lastName = lnErr;
    const emErr = validateEmail(formData.email);
    if (emErr) newErrors.email = emErr;
    const pwErr = validatePassword(formData.password);
    if (pwErr) newErrors.password = pwErr;
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    if (formData.role === 'instructor') {
      if (!formData.reason.trim()) newErrors.reason = 'Please explain why you want to be an instructor';
      if (!files.idCard) newErrors.idCard = 'ID Card is required';
      if (!files.cv) newErrors.cv = 'CV is required';
      if (!files.diploma) newErrors.diploma = 'Diploma is required';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await register(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName,
        formData.role,
        formData.reason,
        formData.experience,
        files
      );
      navigate('/dashboard');
    } catch (err) {
      // Error is handled by store
    }
  };

  const googleLoginHandler = useGoogleLogin({
    onSuccess: (tokenResponse) => handleGoogleSuccess(tokenResponse),
    onError: () => console.error('Google Login Failed'),
  });

  const handleGoogleSuccess = async (tokenResponse) => {
    try {
      if (formData.role === 'instructor') {
        if (!formData.reason.trim() || !files.idCard || !files.cv || !files.diploma) {
          setErrors({
            reason: !formData.reason.trim() ? 'Reason is required' : '',
            idCard: !files.idCard ? 'ID Card is required' : '',
            cv: !files.cv ? 'CV is required' : '',
            diploma: !files.diploma ? 'Diploma is required' : '',
          });
          return;
        }
      }

      await googleLogin(
        tokenResponse.access_token,
        formData.role,
        formData.reason,
        formData.experience,
        files
      );
      navigate('/dashboard');
    } catch (err) {}
  };

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
          <h1 className="text-2xl font-black text-txt mb-1 text-center">Create Account</h1>
          <p className="text-txt-muted text-center mb-6">Join our learning community today</p>

          {error && (
            <div className="mb-4 p-3 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-txt-secondary mb-2">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                  <input
                    type="text"
                    name="firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={handleChange}
                    maxLength={50}
                    className={`input-field pl-12 ${errors.firstName ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.firstName && <p className="text-red-400 text-sm mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-txt-secondary mb-2">Last Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleChange}
                    maxLength={50}
                    className={`input-field pl-12 ${errors.lastName ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.lastName && <p className="text-red-400 text-sm mt-1">{errors.lastName}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-txt-secondary mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  maxLength={100}
                  className={`input-field pl-12 ${errors.email ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-txt-secondary mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                <input
                  type="password"
                  name="password"
                  placeholder="--------"
                  value={formData.password}
                  onChange={handleChange}
                  className={`input-field pl-12 ${errors.password ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-txt-secondary mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="--------"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`input-field pl-12 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.confirmPassword && <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>}
            </div>

            {/* Role Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-txt-secondary">Register as:</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'student' }))}
                  className={`py-3 px-4 rounded-xl border-2 font-bold transition-all ${
                    formData.role === 'student'
                      ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-500/20 text-white'
                      : 'bg-surface border-bdr text-txt-muted hover:border-indigo-400/50'
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, role: 'instructor' }))}
                  className={`py-3 px-4 rounded-xl border-2 font-bold transition-all ${
                    formData.role === 'instructor'
                      ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-500/20 text-white'
                      : 'bg-surface border-bdr text-txt-muted hover:border-indigo-400/50'
                  }`}
                >
                  Instructor
                </button>
              </div>
            </div>

            {/* Instructor Fields */}
            {formData.role === 'instructor' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div>
                  <label className="block text-sm font-semibold text-txt-secondary mb-2">Why do you want to be an instructor?</label>
                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    placeholder="Tell us about your teaching goals..."
                    className={`input-field min-h-[100px] py-3 ${errors.reason ? 'border-red-500' : ''}`}
                  />
                  {errors.reason && <p className="text-red-400 text-sm mt-1">{errors.reason}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-txt-secondary mb-2">Teaching Experience (Optional)</label>
                  <textarea
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    placeholder="Your previous experience..."
                    className="input-field min-h-[100px] py-3"
                  />
                </div>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-txt-secondary">Carte d'Identité (ID Card)</label>
                    <input
                      type="file"
                      name="idCard"
                      onChange={handleFileChange}
                      required
                      accept=".jpg,.jpeg,.png,.pdf"
                      className="block w-full text-sm text-txt-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 transition-all"
                    />
                    {errors.idCard && <p className="text-red-400 text-sm mt-1">{errors.idCard}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-txt-secondary">Curriculum Vitae (CV)</label>
                    <input
                      type="file"
                      name="cv"
                      onChange={handleFileChange}
                      required
                      accept=".jpg,.jpeg,.png,.pdf"
                      className="block w-full text-sm text-txt-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 transition-all"
                    />
                    {errors.cv && <p className="text-red-400 text-sm mt-1">{errors.cv}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-txt-secondary">Diplôme (Diploma)</label>
                    <input
                      type="file"
                      name="diploma"
                      onChange={handleFileChange}
                      required
                      accept=".jpg,.jpeg,.png,.pdf"
                      className="block w-full text-sm text-txt-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 transition-all"
                    />
                    {errors.diploma && <p className="text-red-400 text-sm mt-1">{errors.diploma}</p>}
                  </div>
                </div>

                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 italic">
                    Note: Your instructor account and documents will be reviewed by our admin team.
                  </p>
                </div>
              </div>
            )}

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2"><UserPlus className="w-4 h-4" /> Create Account</span>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-[2px] bg-black/5"></div>
            <span className="text-xs font-bold text-txt-muted uppercase tracking-widest">Or continue with</span>
            <div className="flex-1 h-[2px] bg-black/5"></div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button 
              type="button"
              onClick={() => googleLoginHandler()}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-surface-card border border-bdr rounded-xl font-bold text-txt hover:bg-surface-hover transition-all shadow-sm group"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
              </svg>
              Sign up with Google
            </button>
            {formData.role === 'instructor' && (
              <p className="text-[10px] text-txt-muted font-bold uppercase tracking-wider">
                Please fill the instructor form above first
              </p>
            )}
          </div>

          <p className="text-center text-txt-muted mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-500 font-semibold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
