const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const socketHandler = (io) => {
  // ─── Auth Middleware for Socket ────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔗 Connected: ${socket.user.name} [${socket.id}]`);

    // Mark user online
    await User.findByIdAndUpdate(userId, { isOnline: true });

    // Join personal room (for direct notifications)
    socket.join(userId);

    // Broadcast online status to all other users
    socket.broadcast.emit('user:online', { userId });

    // ── Join all conversation rooms this user belongs to ──────────────────
    socket.on('join:conversations', async () => {
      const conversations = await Conversation.find({
        participants: socket.user._id,
      });
      conversations.forEach((conv) => socket.join(conv._id.toString()));
      console.log(`📬 ${socket.user.name} joined ${conversations.length} rooms`);
    });

    // ── Join a single conversation room ───────────────────────────────────
    socket.on('join:conversation', (conversationId) => {
      socket.join(conversationId);
    });

    // ── Send Message ──────────────────────────────────────────────────────
    socket.on('message:send', async ({ conversationId, content }) => {
      try {
        // Verify user is participant
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.user._id,
        });

        if (!conversation) {
          return socket.emit('error', { message: 'Not a member of this conversation' });
        }

        // Save to DB
        const message = await Message.create({
          conversation: conversationId,
          sender: socket.user._id,
          content,
          readBy: [socket.user._id],
        });

        // Update lastMessage + updatedAt on conversation
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
          updatedAt: new Date(),
        });

        const populated = await Message.findById(message._id).populate(
          'sender',
          'name avatar email'
        );

        // Emit to everyone in the conversation room (includes sender)
        io.to(conversationId).emit('message:received', {
          ...populated.toObject(),
          conversationId,
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── Typing Indicators ─────────────────────────────────────────────────
    socket.on('typing:start', ({ conversationId }) => {
      socket.to(conversationId).emit('typing:start', {
        userId,
        userName: socket.user.name,
        conversationId,
      });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(conversationId).emit('typing:stop', {
        userId,
        conversationId,
      });
    });

    // ── Mark messages as read ─────────────────────────────────────────────
    socket.on('messages:read', async ({ conversationId }) => {
      await Message.updateMany(
        {
          conversation: conversationId,
          readBy: { $ne: socket.user._id },
        },
        { $addToSet: { readBy: socket.user._id } }
      );

      socket.to(conversationId).emit('messages:read', {
        conversationId,
        userId,
      });
    });

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`❌ Disconnected: ${socket.user.name} [${socket.id}]`);
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date(),
      });
      socket.broadcast.emit('user:offline', { userId });
    });
  });
};

module.exports = socketHandler;
