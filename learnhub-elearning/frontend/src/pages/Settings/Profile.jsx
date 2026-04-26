import { useState, useEffect } from 'react';
import { User, Mail, FileText, Link as LinkIcon, Bell, Globe, Save, Camera, Sun, Moon } from 'lucide-react';
import api from '../../utils/api.js';
import { validateName, validateUrl } from '../../utils/validators.js';
import useAuth from '../../hooks/useAuth.js';
import useAuthStore from '../../context/authStore.js';
import { useTheme } from '../../context/ThemeContext.jsx';

const Profile = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setBio(user.bio || '');
      setAvatarUrl(user.avatar || '');
      setEmailNotifications(user.settings?.emailNotifications ?? true);
      setPublicProfile(user.settings?.publicProfile ?? true);
    }
  }, [user]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    const fnErr = validateName(firstName, 'First name');
    const lnErr = validateName(lastName, 'Last name');
    const urlErr = avatarUrl ? validateUrl(avatarUrl) : null;
    if (fnErr || lnErr || urlErr) {
      setError(fnErr || lnErr || urlErr);
      return;
    }

    setSaving(true);

    try {
      const { data } = await api.put(`/api/users/${user._id}`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim(),
        avatar: avatarUrl.trim(),
        settings: {
          emailNotifications,
          publicProfile,
        },
      });
      // Update global user state so Navbar and other components reflect changes
      const updatedUser = data.user || data;
      useAuthStore.getState().setUser(updatedUser);
      setToast('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-surface">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-green-400/10 border border-green-400/20 text-green-400 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-semibold">{toast}</span>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-txt">Profile Settings</h1>
          <p className="mt-1 text-txt-muted">Manage your personal information and preferences</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar Section */}
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6">
            <h2 className="text-lg font-bold text-txt mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-yellow-400" /> Avatar
            </h2>
            <div className="flex items-center gap-5">
              <div className="flex-shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-bdr"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className={`w-20 h-20 rounded-2xl bg-yellow-400/10 border-2 border-yellow-400/20 items-center justify-center text-2xl font-black text-yellow-400 ${
                    avatarUrl ? 'hidden' : 'flex'
                  }`}
                >
                  {initials}
                </div>
              </div>
              <div className="flex-1">
                <label className="flex items-center gap-2 text-sm font-semibold text-txt-secondary mb-2">
                  <LinkIcon className="w-4 h-4 text-txt-muted" /> Avatar URL
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/your-photo.jpg"
                  className="input-field text-sm"
                />
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6">
            <h2 className="text-lg font-bold text-txt mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-yellow-400" /> Personal Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-txt-secondary mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  maxLength={50}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-txt-secondary mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  maxLength={50}
                  className="input-field"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-txt-secondary mb-2">
                <Mail className="w-4 h-4 text-txt-muted" /> Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="input-field opacity-50 cursor-not-allowed"
              />
              <p className="text-xs text-txt-muted mt-1">Email cannot be changed.</p>
            </div>
            <div className="mt-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-txt-secondary mb-2">
                <FileText className="w-4 h-4 text-txt-muted" /> Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
                maxLength={500}
                className="input-field resize-none"
              />
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-surface-card border-2 border-bdr rounded-2xl p-6">
            <h2 className="text-lg font-bold text-txt mb-4">Preferences</h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl border-2 border-bdr hover:border-bdr-hover transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-txt">Email Notifications</p>
                    <p className="text-xs text-txt-muted">Receive email updates about your courses</p>
                  </div>
                </div>
                <div
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                    emailNotifications ? 'bg-yellow-400' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform ${
                      emailNotifications ? 'translate-x-5 bg-black' : 'bg-gray-400'
                    }`}
                  />
                </div>
              </label>
              <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl border-2 border-bdr hover:border-bdr-hover transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-txt">Public Profile</p>
                    <p className="text-xs text-txt-muted">Make your profile visible to other users</p>
                  </div>
                </div>
                <div
                  onClick={() => setPublicProfile(!publicProfile)}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                    publicProfile ? 'bg-yellow-400' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform ${
                      publicProfile ? 'translate-x-5 bg-black' : 'bg-gray-400'
                    }`}
                  />
                </div>
              </label>
              <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl border-2 border-bdr hover:border-bdr-hover transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center">
                    {theme === 'dark' ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-purple-400" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-txt">Dark Mode</p>
                    <p className="text-xs text-txt-muted">Toggle between light and dark theme</p>
                  </div>
                </div>
                <div
                  onClick={toggleTheme}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                    theme === 'dark' ? 'bg-yellow-400' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform ${
                      theme === 'dark' ? 'translate-x-5 bg-black' : 'bg-gray-400'
                    }`}
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary inline-flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
