import ChatMessage from '../models/ChatMessage.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import { createNotification } from '../controllers/notificationController.js';

const activeUsers = new Map();
const testRooms = new Map();

export const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // User identifies themselves - join their personal notification room
    socket.on('user:identify', (userId) => {
      if (userId) {
        socket.userId = userId;
        socket.join(`user_${userId}`);
        activeUsers.set(userId, { socketId: socket.id, status: 'online' });
        io.emit('users:online', Array.from(activeUsers.keys()));
      }
    });

    // Get online users
    socket.on('users:get-online', () => {
      socket.emit('users:online', Array.from(activeUsers.keys()));
    });

    // Chat: join room (for group chat and course channels)
    socket.on('chat:join-room', ({ roomId, userId }) => {
      socket.join(roomId);
      socket.to(roomId).emit('chat:user-online', { userId, roomId });
    });

    // Chat: send message to room (works for general, course channels, etc.)
    socket.on('chat:send-message', async ({ roomId, content, userId }) => {
      try {
        const message = await ChatMessage.create({ senderId: userId, roomId, content });
        const populated = await ChatMessage.findById(message._id)
          .populate('senderId', 'firstName lastName avatar');
        io.to(roomId).emit('chat:receive-message', populated);

        // Notify enrolled users for course channels (skip general — too noisy)
        if (roomId.startsWith('course_')) {
          const courseId = roomId.replace('course_', '');
          const enrollments = await Enrollment.find({ courseId }).select('userId');
          const course = await Course.findById(courseId).select('instructor title');

          const recipientIds = enrollments.map(e => e.userId.toString());
          if (course?.instructor) recipientIds.push(course.instructor.toString());
          const uniqueRecipients = [...new Set(recipientIds)].filter(id => id !== userId);

          // Find who is currently in the room
          const socketsInRoom = await io.in(roomId).fetchSockets();
          const usersInRoom = new Set(socketsInRoom.map(s => s.userId).filter(Boolean));

          const sender = populated.senderId;
          const senderName = `${sender.firstName} ${sender.lastName}`;
          for (const recipientId of uniqueRecipients) {
            if (!usersInRoom.has(recipientId)) {
              createNotification(
                io, recipientId, 'message',
                `New message in ${course?.title || 'course'}`,
                `${senderName}: ${content.substring(0, 80)}`,
                { roomId, fromUserId: userId },
                `/chat?room=${roomId}`
              );
            }
          }
        }
      } catch (err) {
        socket.emit('chat:error', { message: 'Failed to send message' });
      }
    });

    // Chat: send direct message
    socket.on('chat:send-dm', async ({ toUserId, content, userId }) => {
      try {
        // Create a consistent DM room ID (sort both IDs so it's always the same)
        const roomId = [userId, toUserId].sort().join('_dm_');
        const message = await ChatMessage.create({ senderId: userId, roomId, content });
        const populated = await ChatMessage.findById(message._id)
          .populate('senderId', 'firstName lastName avatar');

        // Send to both users
        io.to(`user_${userId}`).emit('chat:receive-message', populated);
        io.to(`user_${toUserId}`).emit('chat:receive-message', populated);

        // Create notification for recipient
        const sender = populated.senderId;
        createNotification(
          io, toUserId, 'message',
          'New Message',
          `${sender.firstName} ${sender.lastName} sent you a message`,
          { roomId, fromUserId: userId },
          `/chat?room=${roomId}`
        );
      } catch (err) {
        socket.emit('chat:error', { message: 'Failed to send message' });
      }
    });

    // Chat: typing indicator
    socket.on('chat:typing', ({ roomId, userId, userName }) => {
      socket.to(roomId).emit('chat:user-typing', { userId, userName, roomId });
    });

    // Chat: mark messages as read
    socket.on('chat:mark-read', async ({ roomId, userId }) => {
      try {
        await ChatMessage.updateMany(
          { roomId, senderId: { $ne: userId }, readBy: { $ne: userId } },
          { $addToSet: { readBy: userId } }
        );
      } catch (err) {
        console.error('Mark read error:', err);
      }
    });

    // Chat: leave room
    socket.on('chat:leave-room', ({ roomId, userId }) => {
      socket.leave(roomId);
      socket.to(roomId).emit('chat:user-offline', { userId });
    });

    // Test room events
    socket.on('test:join-room', ({ testId, userId }) => {
      const roomId = `test-${testId}`;
      socket.join(roomId);
      if (!testRooms.has(testId)) {
        testRooms.set(testId, { participants: new Set(), startTime: Date.now(), duration: 0 });
      }
      testRooms.get(testId).participants.add(userId);
      io.to(roomId).emit('test:participant-joined', { userId, count: testRooms.get(testId).participants.size });
    });

    socket.on('test:timer-sync-request', ({ testId }) => {
      const room = testRooms.get(testId);
      if (room) {
        const elapsed = Date.now() - room.startTime;
        const remaining = Math.max(0, room.duration - elapsed);
        socket.emit('test:timer-sync', { remaining, testId });
      }
    });

    socket.on('test:submit-answer', ({ testId, questionIndex, answer }) => {
      socket.emit('test:answer-received', { questionIndex });
    });

    socket.on('test:reconnect', ({ testId, userId, sessionId }) => {
      const roomId = `test-${testId}`;
      socket.join(roomId);
      const room = testRooms.get(testId);
      if (room) {
        room.participants.add(userId);
        const elapsed = Date.now() - room.startTime;
        const remaining = Math.max(0, room.duration - elapsed);
        socket.emit('test:reconnect-ack', { remaining, testId });
        socket.to(roomId).emit('test:user-reconnected', { userId });
      }
    });

    socket.on('test:leave-room', ({ testId, userId }) => {
      const roomId = `test-${testId}`;
      socket.leave(roomId);
      const room = testRooms.get(testId);
      if (room) {
        room.participants.delete(userId);
        if (room.participants.size === 0) testRooms.delete(testId);
        io.to(roomId).emit('test:participant-left', { userId });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (socket.userId) {
        activeUsers.delete(socket.userId);
        io.emit('users:online', Array.from(activeUsers.keys()));
      }
    });
  });

  // Timer sync interval for test rooms
  setInterval(() => {
    for (const [testId, room] of testRooms) {
      const elapsed = Date.now() - room.startTime;
      const remaining = Math.max(0, room.duration - elapsed);
      io.to(`test-${testId}`).emit('test:timer-sync', { remaining, testId });
      if (remaining <= 0) {
        io.to(`test-${testId}`).emit('test:test-ended', { testId });
        testRooms.delete(testId);
      }
    }
  }, 5000);
};
