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
                    ? 'bg-yellow-400/10 text-yellow-400 border-l-2 border-yellow-400 -ml-[2px]'
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
                    ? 'bg-yellow-400/10 text-yellow-400 border-l-2 border-yellow-400 -ml-[2px]'
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
      <div className="p-3 border-t border-bdr">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-card border border-bdr/50">
          <div className="w-9 h-9 rounded-lg bg-yellow-400 flex items-center justify-center text-black text-sm font-black border-2 border-black flex-shrink-0">
            {userInitial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-txt truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-txt-muted truncate">{user?.roles?.join(', ')}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
