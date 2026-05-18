import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import ReportModal from '../modals/ReportModal.jsx';

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

const ChatBubble = ({ message, isOwn, roomId }) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const sender = message.senderId || {};
  const initial = sender.firstName?.charAt(0)?.toUpperCase() || '?';

  return (
    <div id={`content-${message._id}`} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`flex gap-2 max-w-[75%] ${isOwn ? 'flex-row-reverse' : ''}`}>
        {!isOwn && (
          <Link to={sender._id ? `/users/${sender._id}` : '#'} className="flex-shrink-0 mt-1">
            <div className="w-7 h-7 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400 text-xs font-bold hover:bg-yellow-400/20 transition-colors">
              {initial}
            </div>
          </Link>
        )}
        <div>
          {!isOwn && (
            <Link to={sender._id ? `/users/${sender._id}` : '#'} className="hover:text-yellow-400 transition-colors">
              <p className="text-xs text-txt-muted mb-1 ml-1 font-medium hover:text-yellow-400">
                {sender.firstName} {sender.lastName}
              </p>
            </Link>
          )}
          <div className={`px-4 py-2.5 text-sm leading-relaxed ${
            isOwn
              ? 'bg-yellow-400/20 text-yellow-100 rounded-l-2xl rounded-tr-2xl'
              : 'bg-surface-input text-txt-secondary rounded-r-2xl rounded-tl-2xl border border-bdr'
          }`}>
            {message.content}
          </div>
          <div className={`flex items-center gap-2 mt-1 ${isOwn ? 'justify-end mr-1' : 'ml-1'}`}>
            <p className="text-[10px] text-txt-muted">
              {formatTime(message.createdAt || message.timestamp)}
            </p>
            {!isOwn && (
              <button 
                onClick={() => setShowReportModal(true)}
                className="p-0.5 rounded text-txt-muted hover:text-red-400 hover:bg-red-400/10 transition-all"
                title="Report message"
              >
                <ShieldAlert className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        contentType="chat"
        contentId={message._id}
        reportedUser={sender._id}
        contentSnapshot={message.content}
        metadata={{ roomId }}
      />
    </div>
  );
};

export default ChatBubble;
