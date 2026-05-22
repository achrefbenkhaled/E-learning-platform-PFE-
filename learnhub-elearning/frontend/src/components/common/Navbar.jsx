import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, X, ChevronDown, LogOut, Settings, User, BookOpen, MessageSquare, GraduationCap, Sun, Moon, LayoutDashboard, MessageCircle, Shield, ClipboardList } from 'lucide-react';
import api from '../../utils/api.js';
import { timeAgo } from '../../utils/helpers.js';
import { useSocket } from '../../context/SocketContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

const Navbar = ({ user, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();
  const socket = useSocket();
  const { theme, toggleTheme } = useTheme();

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setProfileDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get('/api/notifications');
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } catch (err) {
        // silently fail
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Socket: listen for new notifications
  useEffect(() => {
    if (!socket) return;
    const handleNewNotif = (notif) => {
      setNotifications(prev => [notif, ...prev].slice(0, 30));
      setUnreadCount(prev => prev + 1);
    };
    socket.on('notification:new', handleNewNotif);
    return () => socket.off('notification:new', handleNewNotif);
  }, [socket]);

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/all/read');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {}
  };

  const handleLogout = () => {
    setProfileDropdownOpen(false);
    onLogout();
    navigate('/login');
  };

  const navLinks = [
    { label: 'Courses', to: '/courses', icon: BookOpen },
    { label: 'Community', to: '/community', icon: MessageSquare },
    { label: 'Tests', to: '/tests', icon: GraduationCap },
  ];

  const mobileNavItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Courses', to: '/courses', icon: BookOpen },
    { label: 'Community', to: '/community', icon: MessageSquare },
    { label: 'Chat', to: '/chat', icon: MessageCircle },
    { label: 'Tests', to: '/tests', icon: ClipboardList },
    { label: 'Settings', to: '/settings', icon: Settings },
  ];

  const userInitial = user?.firstName?.charAt(0)?.toUpperCase() || 'U';

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-md border-b border-bdr z-50">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between">
        {/* Left: Logo + Hamburger */}
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden p-2 rounded-xl text-txt-secondary hover:text-indigo-500 hover:bg-indigo-500/10 transition-all"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to={user?.roles?.includes('admin') ? "/admin" : "/dashboard"} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center rotate-[-3deg] shadow-lg shadow-indigo-500/20">
              <span className="text-white font-black text-sm">L</span>
            </div>
            <span className="text-xl font-black text-txt">
              Learn<span className="text-indigo-600">Hub</span>
            </span>
          </Link>
        </div>

        {/* Center: Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
            <input
              type="text"
              placeholder="Search courses, topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  navigate(`/courses?search=${encodeURIComponent(searchQuery.trim())}`);
                  setSearchQuery('');
                }
              }}
              className="w-full pl-12 pr-4 py-2 bg-surface-input border border-bdr rounded-xl text-sm text-txt placeholder-txt-muted
                         focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Nav links (desktop) */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isAdmin = user?.roles?.includes('admin');
              const isAllowedForAdmin = ['Community'].includes(link.label);
              if (isAdmin && !isAllowedForAdmin) return null;
              
              return (
                <Link key={link.to} to={link.to}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-txt-secondary
                             hover:text-indigo-600 hover:bg-indigo-500/5 rounded-xl transition-all">
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Theme toggle */}
          <button onClick={toggleTheme} className="p-2 rounded-xl text-txt-muted hover:text-indigo-500 hover:bg-indigo-500/10 transition-all">
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-xl text-txt-secondary hover:text-indigo-600 hover:bg-indigo-500/10 transition-all"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-indigo-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-surface">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-surface-card border-2 border-bdr rounded-2xl shadow-brutal animate-scaleIn overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-bdr">
                  <h3 className="text-sm font-bold text-txt">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-indigo-600 hover:text-indigo-500">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-txt-muted text-sm">No notifications yet</div>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <div key={n._id}
                        onClick={async () => {
                          if (!n.read) {
                            try { await api.put(`/api/notifications/${n._id}/read`); } catch {}
                            setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
                            setUnreadCount(prev => Math.max(0, prev - 1));
                          }
                          setNotifOpen(false);
                          if (n.link) navigate(n.link);
                        }}
                        className={`px-4 py-3 border-b border-bdr/50 hover:bg-surface-hover transition-colors cursor-pointer ${!n.read ? 'bg-indigo-500/5' : ''}`}>
                        <p className="text-sm font-semibold text-txt">{n.title}</p>
                        <p className="text-xs text-txt-muted mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-txt-muted mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-hover transition-all">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="Avatar"
                  className="w-8 h-8 rounded-lg object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-8 h-8 rounded-lg bg-indigo-600 items-center justify-center text-white text-sm font-black ${user?.avatar ? 'hidden' : 'flex'}`}>
                {userInitial}
              </div>
              <ChevronDown className="hidden sm:block w-4 h-4 text-txt-muted" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface-card border-2 border-bdr rounded-2xl shadow-brutal animate-scaleIn overflow-hidden">
                <div className="px-4 py-3 border-b border-bdr">
                  <p className="text-sm font-bold text-txt">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-txt-muted">{user?.email}</p>
                </div>
                <div className="py-1">
                  <Link to={`/users/${user?._id}`} onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-txt-secondary hover:text-indigo-600 hover:bg-indigo-500/5 transition-all">
                    <User className="w-4 h-4" /> View Profile
                  </Link>
                  <Link to="/settings" onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-txt-secondary hover:text-indigo-600 hover:bg-indigo-500/5 transition-all">
                    <Settings className="w-4 h-4" /> Settings
                  </Link>
                </div>
                <div className="border-t border-bdr py-1">
                  <button onClick={handleLogout}
                    className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/5 transition-all">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-surface border-t border-bdr animate-fadeIn">
          <div className="px-4 py-3 md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
              <input type="text" placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    navigate(`/courses?search=${encodeURIComponent(searchQuery.trim())}`);
                    setSearchQuery('');
                    setMobileMenuOpen(false);
                  }
                }}
                className="w-full pl-12 pr-4 py-2 bg-surface-input border-2 border-bdr rounded-xl text-sm text-txt placeholder-txt-muted focus:border-yellow-400/50 focus:outline-none" />
            </div>
          </div>
          <div className="px-2 pb-3 space-y-1">
            {mobileNavItems.map((link) => {
              const isAdmin = user?.roles?.includes('admin');
              const isAllowedForAdmin = ['Community', 'Chat', 'Settings'].includes(link.label);
              if (isAdmin && !isAllowedForAdmin) return null;

              return (
                <Link key={link.to} to={link.to} onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-txt-secondary hover:text-yellow-400 hover:bg-yellow-400/5 rounded-xl transition-all">
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
            {user?.roles?.includes('admin') && (
              <Link to="/admin" onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-txt-secondary hover:text-yellow-400 hover:bg-yellow-400/5 rounded-xl transition-all">
                <Shield className="w-4 h-4" />
                Admin Panel
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
