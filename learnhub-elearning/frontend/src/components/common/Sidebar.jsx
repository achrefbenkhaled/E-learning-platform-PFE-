import { Link } from 'react-router-dom';
import { LayoutDashboard, BookOpen, GraduationCap, Users, MessageCircle, ClipboardCheck, Settings, Shield, FileText, UserCheck } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', to: '/dashboard', key: 'dashboard', icon: LayoutDashboard },
  { label: 'Courses', to: '/courses', key: 'courses', icon: BookOpen },
  { label: 'My Courses', to: '/courses/my', key: 'my-courses', icon: GraduationCap },
  { label: 'Community', to: '/community', key: 'community', icon: Users },
  { label: 'Chat', to: '/chat', key: 'chat', icon: MessageCircle },
  { label: 'Tests', to: '/tests', key: 'tests', icon: ClipboardCheck },
  { label: 'Settings', to: '/settings', key: 'settings', icon: Settings },
];

const adminItems = [
  { label: 'Dashboard', to: '/admin', key: 'admin-dashboard', icon: LayoutDashboard },
  { label: 'Users', to: '/admin/users', key: 'admin-users', icon: Users },
  { label: 'Courses', to: '/admin/courses', key: 'admin-courses', icon: BookOpen },
  { label: 'Tests', to: '/admin/tests', key: 'admin-tests', icon: FileText },
  { label: 'Moderation', to: '/admin/moderation', key: 'admin-moderation', icon: Shield },
  { label: 'Instructor Requests', to: '/admin/instructor-requests', key: 'admin-instructor-requests', icon: UserCheck },
  { label: 'Community', to: '/community', key: 'community', icon: Users },
  { label: 'Chat', to: '/chat', key: 'chat', icon: MessageCircle },
];

const Sidebar = ({ activePage, user }) => {
  const userInitial = user?.firstName?.charAt(0)?.toUpperCase() || 'U';
  const isAdmin = user?.roles?.includes('admin');

  return (
    <aside className="fixed top-16 left-0 bottom-0 w-64 bg-surface border-r border-bdr hidden lg:flex flex-col z-40">
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {isAdmin ? (
          adminItems.map((item) => {
            const isActive = activePage === item.key || activePage === 'admin';
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-600 border-l-2 border-indigo-600 -ml-[2px]'
                    : 'text-txt-muted hover:text-txt hover:bg-surface-hover'
                }`}>
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })
        ) : (
          navItems.map((item) => {
            const isActive = activePage === item.key || activePage === item.to.replace('/', '');
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-600 border-l-2 border-indigo-600 -ml-[2px]'
                    : 'text-txt-muted hover:text-txt hover:bg-surface-hover'
                }`}>
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })
        )}
      </nav>

      {/* User card at bottom */}
      <div className="p-4 border-t border-bdr bg-surface-card/30">
        <Link to="/settings" className="flex items-center gap-3 p-2 rounded-2xl hover:bg-surface-hover transition-all group">
          <div className="relative">
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt="Avatar" 
                className="w-10 h-10 rounded-xl object-cover border-2 border-bdr group-hover:border-yellow-400/50 transition-colors"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-sm font-black border-2 border-transparent">
                {userInitial}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-surface rounded-full shadow-sm"></div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-txt truncate group-hover:text-yellow-400 transition-colors">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[10px] font-bold text-txt-muted uppercase tracking-wider">
              {user?.roles?.[0] || 'Student'}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
