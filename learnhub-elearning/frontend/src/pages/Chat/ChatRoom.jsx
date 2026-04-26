import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../context/SocketContext';
import api from '../../utils/api';
import ChatBubble from '../../components/chat/ChatBubble';
import MessageInput from '../../components/chat/MessageInput';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { MessageCircle, Send, Users, Hash, Search, Plus, X, User, ChevronDown, BookOpen } from 'lucide-react';

const ChatRoom = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rooms, setRooms] = useState([]);
  const [courseChannels, setCourseChannels] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activeRoom, setActiveRoom] = useState(searchParams.get('room') || 'general');
  const [activeRoomLabel, setActiveRoomLabel] = useState('General');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typingUser, setTypingUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('rooms'); // 'rooms' | 'users'
  const [searchQuery, setSearchQuery] = useState('');
  const [dmRooms, setDmRooms] = useState([]); // tracked DM rooms

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Generate consistent DM room ID (sorted)
  const getDmRoomId = (userId1, userId2) => {
    const sorted = [userId1, userId2].sort();
    return `${sorted[0]}_dm_${sorted[1]}`;
  };

  // Check if a room ID is a DM
  const isDmRoom = (roomId) => roomId.includes('_dm_');

  // Check if a room ID is a course channel
  const isCourseChannel = (roomId) => roomId.startsWith('course_');

  // Get the other user's info from a DM room
  const getDmPartner = (roomId) => {
    if (!isDmRoom(roomId) || !user) return null;
    const parts = roomId.split('_dm_');
    const partnerId = parts[0] === user._id ? parts[1] : parts[0];
    return allUsers.find((u) => u._id === partnerId);
  };

  // Get course channel info
  const getCourseInfo = (roomId) => {
    return courseChannels.find((c) => c.roomId === roomId);
  };

  // Format room display name
  const formatRoomName = (roomId) => {
    if (isDmRoom(roomId)) {
      const partner = getDmPartner(roomId);
      if (partner) return `${partner.firstName} ${partner.lastName}`;
      return 'Direct Message';
    }
    if (isCourseChannel(roomId)) {
      const info = getCourseInfo(roomId);
      if (info) return info.roomName;
      return 'Course Channel';
    }
    if (roomId === 'general') return 'General';
    return roomId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const { data } = await api.get('/api/chat/rooms');
        // New format: { rooms: [...], courseChannels: [...] }
        const roomList = Array.isArray(data) ? data : (data.rooms || []);
        const channels = data.courseChannels || [];

        // Separate group rooms and DM rooms
        const groupRooms = [];
        const dmList = [];
        roomList.forEach((r) => {
          const room = typeof r === 'string' ? { roomId: r, lastMessage: null, unread: 0 } : r;
          if (isDmRoom(room.roomId)) {
            dmList.push(room);
          } else {
            groupRooms.push(room);
          }
        });

        if (!groupRooms.find(r => r.roomId === 'general')) {
          groupRooms.unshift({ roomId: 'general', lastMessage: null, unread: 0 });
        }

        setRooms(groupRooms);
        setDmRooms(dmList);
        setCourseChannels(channels.map(ch => ({ ...ch, unread: ch.unread || 0 })));
      } catch (err) {
        console.error('Failed to fetch rooms:', err);
        setRooms(['general']);
      }
    };
    fetchRooms();
  }, []);

  // Fetch users for DM
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await api.get('/api/chat/users');
        const usersList = data.users || data || [];
        setAllUsers(usersList.filter((u) => u._id !== user?._id));
      } catch (err) {
        console.error('Failed to fetch users:', err);
      }
    };
    if (user) fetchUsers();
  }, [user]);

  // Fetch messages when room changes
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/chat/${activeRoom}/messages`);
      setMessages(data.messages || data || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [activeRoom]);

  useEffect(() => {
    fetchMessages();
    setActiveRoomLabel(formatRoomName(activeRoom));
  }, [fetchMessages, activeRoom]);

  // Socket events
  useEffect(() => {
    if (!socket || !user) return;

    // Identify user to server
    socket.emit('user:identify', { userId: user._id });

    // Join room and mark as read
    socket.emit('chat:join-room', { roomId: activeRoom, userId: user._id });
    socket.emit('chat:mark-read', { roomId: activeRoom, userId: user._id });

    // Listen for new messages
    const handleReceiveMessage = (msg) => {
      if (msg.roomId === activeRoom) {
        setMessages((prev) => [...prev, msg]);
        socket.emit('chat:mark-read', { roomId: activeRoom, userId: user._id });
      } else {
        // Update sidebar: lastMessage + unread for non-active rooms
        const sender = typeof msg.senderId === 'object'
          ? msg.senderId.firstName
          : 'Someone';
        const newLastMessage = {
          content: msg.content,
          sender,
          time: msg.createdAt || new Date().toISOString(),
        };
        const updateList = (list) =>
          list.map(r => r.roomId === msg.roomId
            ? { ...r, lastMessage: newLastMessage, unread: (r.unread || 0) + 1 }
            : r
          );

        if (msg.roomId.startsWith('course_')) {
          setCourseChannels(prev => updateList(prev));
        } else if (msg.roomId.includes('_dm_')) {
          setDmRooms(prev => {
            const exists = prev.find(r => r.roomId === msg.roomId);
            if (exists) return updateList(prev);
            return [...prev, { roomId: msg.roomId, lastMessage: newLastMessage, unread: 1 }];
          });
        } else {
          setRooms(prev => updateList(prev));
        }
      }
    };

    // Typing indicator
    const handleTyping = ({ userId, roomId, userName }) => {
      if (roomId === activeRoom && userId !== user._id) {
        setTypingUser(userName || 'Someone');
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 2000);
      }
    };

    socket.on('chat:receive-message', handleReceiveMessage);
    socket.on('chat:user-typing', handleTyping);

    return () => {
      socket.off('chat:receive-message', handleReceiveMessage);
      socket.off('chat:user-typing', handleTyping);
      socket.emit('chat:leave-room', { roomId: activeRoom, userId: user._id });
    };
  }, [socket, activeRoom, user]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (content) => {
    if (!socket || !user) return;

    if (isDmRoom(activeRoom)) {
      const parts = activeRoom.split('_dm_');
      const toUserId = parts[0] === user._id ? parts[1] : parts[0];
      socket.emit('chat:send-dm', {
        toUserId,
        content,
        userId: user._id,
      });
    } else {
      socket.emit('chat:send-message', {
        roomId: activeRoom,
        content,
        userId: user._id,
      });
    }
  };

  const handleTyping = () => {
    if (!socket || !user) return;
    socket.emit('chat:typing', {
      roomId: activeRoom,
      userId: user._id,
      userName: `${user.firstName}`,
    });
  };

  const switchRoom = (roomId) => {
    if (roomId === activeRoom) return;
    setActiveRoom(roomId);
    setSearchParams(roomId === 'general' ? {} : { room: roomId }, { replace: true });
    setSidebarOpen(false);
    // Reset unread for the room being opened
    const resetUnread = (list) => list.map(r => r.roomId === roomId ? { ...r, unread: 0 } : r);
    setRooms(prev => resetUnread(prev));
    setDmRooms(prev => resetUnread(prev));
    setCourseChannels(prev => resetUnread(prev));
  };

  const startDm = (targetUser) => {
    const dmRoomId = getDmRoomId(user._id, targetUser._id);
    if (!dmRooms.find(r => r.roomId === dmRoomId)) {
      setDmRooms((prev) => [...prev, { roomId: dmRoomId, lastMessage: null, unread: 0 }]);
    }
    switchRoom(dmRoomId);
    setSidebarTab('rooms');
  };

  // Filtered users for search
  const filteredUsers = allUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="h-[calc(100vh-5.5rem)] bg-surface flex overflow-hidden">
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 bg-surface-card border-2 border-bdr p-2.5 rounded-xl text-txt-secondary hover:text-yellow-400 transition-colors"
      >
        {sidebarOpen ? <X className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
      </button>

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:relative z-40 w-72 h-full bg-surface-card border-r-2 border-bdr flex flex-col transition-transform duration-200`}
      >
        {/* Sidebar Header */}
        <div className="p-5 border-b border-bdr">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-bold text-txt">Chat</h2>
          </div>
          <p className="text-xs text-txt-muted ml-7">Real-time messaging</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-bdr">
          <button
            onClick={() => setSidebarTab('rooms')}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
              sidebarTab === 'rooms'
                ? 'text-yellow-400 border-b-2 border-yellow-400'
                : 'text-txt-muted hover:text-txt-secondary'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            Channels
          </button>
          <button
            onClick={() => setSidebarTab('users')}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
              sidebarTab === 'users'
                ? 'text-yellow-400 border-b-2 border-yellow-400'
                : 'text-txt-muted hover:text-txt-secondary'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Users
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto">
          {sidebarTab === 'rooms' ? (
            <div className="p-3">
              {/* Group Rooms */}
              <p className="text-[10px] font-bold text-txt-muted uppercase tracking-widest px-3 mb-2 mt-1">
                Rooms
              </p>
              {rooms.map((room) => (
                <button
                  key={room.roomId}
                  onClick={() => switchRoom(room.roomId)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all flex items-center gap-3 ${
                    activeRoom === room.roomId
                      ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20'
                      : 'text-txt-secondary hover:bg-surface-input hover:text-txt-secondary border border-transparent'
                  }`}
                >
                  <Hash className="w-4 h-4 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="truncate block">{formatRoomName(room.roomId)}</span>
                    {room.lastMessage && (
                      <span className="text-[10px] text-txt-muted truncate block">
                        {room.lastMessage.sender}: {room.lastMessage.content?.substring(0, 30)}
                      </span>
                    )}
                  </div>
                  {room.unread > 0 && (
                    <span className="w-5 h-5 bg-yellow-400 text-black text-[10px] font-black rounded-full flex items-center justify-center flex-shrink-0">
                      {room.unread > 9 ? '9+' : room.unread}
                    </span>
                  )}
                </button>
              ))}

              {/* Course Channels */}
              {courseChannels.length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-txt-muted uppercase tracking-widest px-3 mb-2 mt-4">
                    Course Channels
                  </p>
                  {courseChannels.map((ch) => (
                    <button
                      key={ch.roomId}
                      onClick={() => switchRoom(ch.roomId)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all flex items-center gap-3 ${
                        activeRoom === ch.roomId
                          ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20'
                          : 'text-txt-secondary hover:bg-surface-input hover:text-txt-secondary border border-transparent'
                      }`}
                    >
                      <BookOpen className="w-4 h-4 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="truncate block">{ch.roomName}</span>
                        {ch.lastMessage ? (
                          <span className="text-[10px] text-txt-muted truncate block">
                            {ch.lastMessage.sender}: {ch.lastMessage.content?.substring(0, 30)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-txt-muted">{ch.memberCount || 0} members</span>
                        )}
                      </div>
                      {ch.unread > 0 && (
                        <span className="w-5 h-5 bg-yellow-400 text-black text-[10px] font-black rounded-full flex items-center justify-center flex-shrink-0">
                          {ch.unread > 9 ? '9+' : ch.unread}
                        </span>
                      )}
                    </button>
                  ))}
                </>
              )}

              {/* DM Rooms */}
              {dmRooms.length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-txt-muted uppercase tracking-widest px-3 mb-2 mt-4">
                    Direct Messages
                  </p>
                  {dmRooms.map((room) => {
                    const partner = getDmPartner(room.roomId);
                    const partnerInitial = partner?.firstName?.charAt(0)?.toUpperCase() || '?';
                    return (
                      <button
                        key={room.roomId}
                        onClick={() => switchRoom(room.roomId)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all flex items-center gap-3 ${
                          activeRoom === room.roomId
                            ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20'
                            : 'text-txt-secondary hover:bg-surface-input hover:text-txt-secondary border border-transparent'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-md bg-yellow-400/10 flex items-center justify-center text-yellow-400 text-[10px] font-bold flex-shrink-0">
                          {partnerInitial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="truncate block">{formatRoomName(room.roomId)}</span>
                          {room.lastMessage && (
                            <span className="text-[10px] text-txt-muted truncate block">
                              {room.lastMessage.sender}: {room.lastMessage.content?.substring(0, 30)}
                            </span>
                          )}
                        </div>
                        {room.unread > 0 && (
                          <span className="w-5 h-5 bg-yellow-400 text-black text-[10px] font-black rounded-full flex items-center justify-center flex-shrink-0">
                            {room.unread > 9 ? '9+' : room.unread}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          ) : (
            /* Users Tab */
            <div className="p-3">
              {/* Search */}
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-txt-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-12 pr-4 py-2.5 bg-surface border-2 border-bdr rounded-xl text-sm text-txt placeholder-txt-muted
                             focus:outline-none focus:border-yellow-400/50 transition-all"
                />
              </div>

              <p className="text-[10px] font-bold text-txt-muted uppercase tracking-widest px-3 mb-2">
                All Users ({filteredUsers.length})
              </p>

              {filteredUsers.length === 0 ? (
                <p className="text-txt-muted text-sm text-center py-6">No users found</p>
              ) : (
                filteredUsers.map((u) => {
                  const uInitial = u.firstName?.charAt(0)?.toUpperCase() || '?';
                  return (
                    <button
                      key={u._id}
                      onClick={() => startDm(u)}
                      className="w-full text-left px-3 py-2.5 rounded-xl mb-1 text-sm transition-all flex items-center gap-3
                                 text-txt-secondary hover:bg-surface-input hover:text-txt-secondary border border-transparent group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400 text-xs font-bold flex-shrink-0">
                        {uInitial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link to={`/users/${u._id}`} onClick={(e) => e.stopPropagation()} className="hover:text-yellow-400 transition-colors">
                          <p className="font-medium truncate">{u.firstName} {u.lastName}</p>
                        </Link>
                        <p className="text-[10px] text-txt-muted">{u.role || 'Student'}</p>
                      </div>
                      <MessageCircle className="w-4 h-4 text-txt-muted group-hover:text-yellow-400 transition-colors flex-shrink-0" />
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Current User */}
        {user && (
          <div className="p-4 border-t border-bdr">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-yellow-400/10 text-yellow-400 flex items-center justify-center text-xs font-bold">
                {user.firstName?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-txt truncate">
                  {user.firstName} {user.lastName}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  <p className="text-xs text-green-400">Online</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="bg-surface-card border-b-2 border-bdr px-6 py-4 flex items-center gap-3">
          {isDmRoom(activeRoom) ? (
            <>
              <div className="w-8 h-8 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400 text-xs font-bold">
                {getDmPartner(activeRoom)?.firstName?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <h3 className="text-base font-semibold text-txt">{activeRoomLabel}</h3>
                <p className="text-[10px] text-txt-muted">Direct Message</p>
              </div>
            </>
          ) : isCourseChannel(activeRoom) ? (
            <>
              <BookOpen className="w-5 h-5 text-yellow-400" />
              <div>
                <h3 className="text-base font-semibold text-txt">{activeRoomLabel}</h3>
                <p className="text-[10px] text-txt-muted">
                  Course Channel {getCourseInfo(activeRoom)?.memberCount ? `· ${getCourseInfo(activeRoom).memberCount} members` : ''}
                </p>
              </div>
            </>
          ) : (
            <>
              <Hash className="w-5 h-5 text-yellow-400" />
              <div>
                <h3 className="text-base font-semibold text-txt">{activeRoomLabel}</h3>
                <p className="text-[10px] text-txt-muted">Group Channel</p>
              </div>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                {isCourseChannel(activeRoom) ? (
                  <>
                    <BookOpen className="w-10 h-10 text-gray-800 mx-auto mb-3" />
                    <p className="text-txt-muted text-sm mb-1">No messages in this course channel yet</p>
                    <p className="text-txt-muted text-xs">Start a discussion with your fellow learners!</p>
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-10 h-10 text-gray-800 mx-auto mb-3" />
                    <p className="text-txt-muted text-sm mb-1">No messages yet</p>
                    <p className="text-txt-muted text-xs">Be the first to say something!</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => {
                const senderId =
                  typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
                const isOwn = senderId === user?._id;
                return <ChatBubble key={msg._id || i} message={msg} isOwn={isOwn} />;
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <MessageInput
          onSend={handleSend}
          onTyping={handleTyping}
          disabled={!socket}
          typingUser={typingUser}
        />
      </div>
    </div>
  );
};

export default ChatRoom;
