import { useState } from 'react';
import { Send } from 'lucide-react';

const MessageInput = ({ onSend, onTyping, disabled = false, typingUser = null }) => {
  const [content, setContent] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim() || disabled) return;
    onSend(content.trim());
    setContent('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
  };

  return (
    <div className="border-t border-bdr bg-surface-card p-4">
      {typingUser && (
        <p className="text-xs text-txt-muted italic mb-2 ml-1">{typingUser} is typing...</p>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input
          type="text" value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (onTyping) onTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled}
          className="flex-1 px-4 py-2.5 bg-surface border-2 border-bdr rounded-xl text-sm text-txt placeholder-txt-muted
                     focus:border-yellow-400/50 focus:outline-none disabled:opacity-50 transition-all"
        />
        <button type="submit" disabled={disabled || !content.trim()}
          className="bg-yellow-400 text-black p-2.5 rounded-xl border-2 border-black
                     shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]
                     hover:translate-x-[2px] hover:translate-y-[2px] transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
