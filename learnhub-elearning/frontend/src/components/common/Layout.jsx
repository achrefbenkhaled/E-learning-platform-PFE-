import { useAuth } from '../../hooks/useAuth';
import useAuthStore from '../../context/authStore';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import ToastNotification from './ToastNotification';

const Layout = ({ children, activePage }) => {
  const { user } = useAuth();
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar user={user} onLogout={logout} />
      <Sidebar activePage={activePage} user={user} />
      <ToastNotification />
      <main className="pt-16 lg:pl-64 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
