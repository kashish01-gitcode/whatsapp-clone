const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    // Group name (empty for direct chats)
    name: {
      type: String,
      default: '',
      trim: true,
    },
    // true = group chat, false = direct 1-on-1 chat
    isGroup: {
      type: Boolean,
      default: false,
    },
    // All users in this conversation
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Only for group chats
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Reference to the most recent message (for sidebar preview)
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    groupAvatar: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', conversationSchema);
