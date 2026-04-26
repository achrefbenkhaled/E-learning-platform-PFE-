import { Link } from 'react-router-dom';

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

const ChatBubble = ({ message, isOwn }) => {
  const sender = message.senderId || {};
  const initial = sender.firstName?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
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
          <p className={`text-[10px] text-txt-muted mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
            {formatTime(message.createdAt || message.timestamp)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
