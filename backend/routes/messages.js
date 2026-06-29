const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { protect } = require('../middleware/authMiddleware');

// ─── GET /api/messages/:conversationId ──────────────────────────────────────
// Fetch all messages in a conversation
router.get('/:conversationId', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      conversation: req.params.conversationId,
    })
      .populate('sender', 'name avatar email')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── POST /api/messages ──────────────────────────────────────────────────────
// Send a message (HTTP fallback if socket fails)
router.post('/', protect, async (req, res) => {
  try {
    const { conversationId, content } = req.body;

    if (!conversationId || !content) {
      return res.status(400).json({ message: 'conversationId and content required' });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      content,
      readBy: [req.user._id],
    });

    // Update last message on conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
    });

    const populated = await Message.findById(message._id).populate(
      'sender',
      'name avatar email'
    );

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
