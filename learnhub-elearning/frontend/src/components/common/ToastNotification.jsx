import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MessageCircle, Bell } from 'lucide-react';
import { useSocket } from '../../context/SocketContext.jsx';

const ToastNotification = () => {
  const [toasts, setToasts] = useState([]);
  const socket = useSocket();
  const navigate = useNavigate();

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notif) => {
      const id = notif._id || Date.now();
      // Build the correct link: prefer notif.link, fallback to data.roomId
      let link = notif.link || '';
      if (!link && notif.data?.roomId) {
        link = `/chat?room=${notif.data.roomId}`;
      }
      setToasts((prev) => [...prev.slice(-4), { id, ...notif, link }]);

      // Auto-remove after 5 seconds
      setTimeout(() => removeToast(id), 5000);
    };

    socket.on('notification:new', handleNotification);
    return () => socket.off('notification:new', handleNotification);
  }, [socket, removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-3 w-80 pointer-events-none">
      {toasts.map((toast) => {
        const isChat = toast.type === 'chat' || toast.type === 'message';
        return (
          <div
            key={toast.id}
            onClick={() => {
              if (toast.link) navigate(toast.link);
              removeToast(toast.id);
            }}
            className="pointer-events-auto bg-surface-card border-2 border-bdr rounded-xl p-4
                       shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]
                       cursor-pointer hover:border-yellow-400/50 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]
                       hover:translate-x-[2px] hover:translate-y-[2px]
                       transition-all animate-slide-in-right"
          >
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isChat ? 'bg-blue-400/10 text-blue-400' : 'bg-yellow-400/10 text-yellow-400'
              }`}>
                {isChat ? <MessageCircle className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-txt truncate">{toast.title || 'Notification'}</p>
                <p className="text-xs text-txt-muted mt-0.5 line-clamp-2">{toast.message || ''}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
                className="text-txt-muted hover:text-txt transition-colors flex-shrink-0 mt-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ToastNotification;
