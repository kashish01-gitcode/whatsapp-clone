const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const { protect } = require('../middleware/authMiddleware');

// ─── GET /api/conversations ─────────────────────────────────────────────────
// Get all conversations for logged-in user
router.get('/', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: { $elemMatch: { $eq: req.user._id } },
    })
      .populate('participants', '-password')
      .populate('groupAdmin', '-password')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name avatar' },
      })
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── POST /api/conversations/direct ─────────────────────────────────────────
// Create or fetch an existing 1-on-1 chat
router.post('/direct', protect, async (req, res) => {
  try {
    const { userId } = req.body;

    // Check if chat already exists
    let conversation = await Conversation.findOne({
      isGroup: false,
      $and: [
        { participants: { $elemMatch: { $eq: req.user._id } } },
        { participants: { $elemMatch: { $eq: userId } } },
      ],
    })
      .populate('participants', '-password')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name avatar' },
      });

    if (conversation) return res.json(conversation);

    // Create new direct chat
    const newConversation = await Conversation.create({
      isGroup: false,
      participants: [req.user._id, userId],
    });

    conversation = await Conversation.findById(newConversation._id).populate(
      'participants',
      '-password'
    );

    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── POST /api/conversations/group ──────────────────────────────────────────
// Create a new group chat
router.post('/group', protect, async (req, res) => {
  try {
    const { name, participants } = req.body;

    if (!name || !participants || participants.length < 2) {
      return res.status(400).json({
        message: 'Group name and at least 2 other participants required',
      });
    }

    const conversation = await Conversation.create({
      name,
      isGroup: true,
      participants: [req.user._id, ...participants],
      groupAdmin: req.user._id,
    });

    const fullConversation = await Conversation.findById(conversation._id)
      .populate('participants', '-password')
      .populate('groupAdmin', '-password');

    res.status(201).json(fullConversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/conversations/group/add ───────────────────────────────────────
// Add a user to a group (admin only)
router.put('/group/add', protect, async (req, res) => {
  try {
    const { conversationId, userId } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: 'Group not found' });

    if (!conversation.groupAdmin.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only admin can add members' });
    }

    const updated = await Conversation.findByIdAndUpdate(
      conversationId,
      { $addToSet: { participants: userId } },
      { new: true }
    )
      .populate('participants', '-password')
      .populate('groupAdmin', '-password');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── PUT /api/conversations/group/remove ────────────────────────────────────
// Remove a user from a group (admin only)
router.put('/group/remove', protect, async (req, res) => {
  try {
    const { conversationId, userId } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation.groupAdmin.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only admin can remove members' });
    }

    const updated = await Conversation.findByIdAndUpdate(
      conversationId,
      { $pull: { participants: userId } },
      { new: true }
    )
      .populate('participants', '-password')
      .populate('groupAdmin', '-password');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
