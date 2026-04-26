import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

const NotFound = () => (
  <div className="min-h-screen bg-surface flex items-center justify-center px-4">
    <div className="text-center max-w-md">
      <div className="w-16 h-16 bg-yellow-400/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <AlertTriangle className="w-8 h-8 text-yellow-400" />
      </div>
      <h1 className="text-6xl font-black text-txt mb-2">404</h1>
      <p className="text-txt-muted text-lg mb-8">Page not found. The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary inline-flex items-center gap-2 px-6 py-3">
        <Home className="w-4 h-4" /> Go Home
      </Link>
    </div>
  </div>
);

export default NotFound;
