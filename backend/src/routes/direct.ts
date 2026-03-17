import express from 'express';
import mongoose from 'mongoose';
import { DirectMessage } from '../models/DirectMessage.js';
import { User } from '../models/User.js';
import { Block } from '../models/Block.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get user's direct message conversations
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.headers.userid as string;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Сначала проверим есть ли вообще сообщения
    const allMessages = await DirectMessage.find({
      $or: [
        { sender: userObjectId },
        { recipient: userObjectId }
      ]
    }).limit(5);
    logger.debug('Loaded direct message sample set', { userId, totalMessages: allMessages.length });

    // Get all users who have exchanged messages with current user
    const conversations = await DirectMessage.aggregate([
      {
        $match: {
          $or: [
            { sender: userObjectId },
            { recipient: userObjectId }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', userObjectId] },
              '$recipient',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$recipient', userObjectId] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          user: {
            _id: '$user._id',
            username: '$user.username',
            avatar: '$user.avatar',
            isOnline: '$user.isOnline'
          },
          lastMessage: '$lastMessage',
          unreadCount: '$unreadCount'
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    logger.debug('Found direct conversations', { userId, count: conversations.length });
    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Create or get conversation with user
router.post('/conversations', async (req, res) => {
  try {
    const currentUserId = req.headers.userid as string;
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ error: 'Participant ID is required' });
    }

    if (currentUserId === participantId) {
      return res.status(400).json({ error: 'Cannot create conversation with yourself' });
    }

    // Check if participant exists
    const participant = await User.findById(participantId).select('username avatar isOnline');
    if (!participant) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if users are blocked
    const isBlocked = await Block.findOne({
      $or: [
        { blocker: currentUserId, blocked: participantId },
        { blocker: participantId, blocked: currentUserId }
      ]
    });

    if (isBlocked) {
      return res.status(403).json({ error: 'Cannot create conversation with blocked user' });
    }

    // Return conversation info
    res.json({ 
      conversationId: participantId, // В директах conversationId = userId собеседника
      participant 
    });
  } catch (error) {
    logger.error('Error creating conversation', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get messages with specific user
router.get('/messages/:userId', async (req, res) => {
  try {
    const currentUserId = req.headers.userid as string;
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    // Check if users are blocked
    const isBlocked = await Block.findOne({
      $or: [
        { blocker: currentUserId, blocked: userId },
        { blocker: userId, blocked: currentUserId }
      ]
    });

    if (isBlocked) {
      return res.status(403).json({ error: 'User is blocked' });
    }

    const messages = await DirectMessage.find({
      $or: [
        { sender: currentUserId, recipient: userId },
        { sender: userId, recipient: currentUserId }
      ]
    })
      .populate('sender', 'username avatar')
      .populate('recipient', 'username avatar')
      .populate('replyTo', 'content sender')
      .sort({ createdAt: -1 })
      .limit(limit * page)
      .skip((page - 1) * limit);

    // Mark messages as read
    await DirectMessage.updateMany(
      {
        sender: userId,
        recipient: currentUserId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({ messages: messages.reverse() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send direct message
router.post('/messages', async (req, res) => {
  try {
    const senderId = req.headers.userid as string;
    const { recipientId, content, messageType, fileUrl, fileName, fileSize, thumbnailUrl, replyTo } = req.body;

    // Check if users are blocked
    const isBlocked = await Block.findOne({
      $or: [
        { blocker: senderId, blocked: recipientId },
        { blocker: recipientId, blocked: senderId }
      ]
    });

    if (isBlocked) {
      return res.status(403).json({ error: 'Cannot send message to blocked user' });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const message = new DirectMessage({
      content,
      sender: senderId,
      recipient: recipientId,
      messageType: messageType || 'text',
      fileUrl,
      fileName,
      fileSize,
      thumbnailUrl,
      replyTo
    });

    await message.save();
    await message.populate('sender', 'username avatar');
    await message.populate('recipient', 'username avatar');

    res.status(201).json({ message });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Edit direct message
router.put('/messages/:messageId', async (req, res) => {
  try {
    const userId = req.headers.userid as string;
    const { messageId } = req.params;
    const { content } = req.body;

    const message = await DirectMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.sender.toString() !== userId) {
      return res.status(403).json({ error: 'Cannot edit this message' });
    }

    if (message.messageType !== 'text') {
      return res.status(400).json({ error: 'Cannot edit file messages' });
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();

    await message.save();
    await message.populate('sender', 'username avatar');
    await message.populate('recipient', 'username avatar');

    res.json({ message });
  } catch (error) {
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// Delete direct message
router.delete('/messages/:messageId', async (req, res) => {
  try {
    const userId = req.headers.userid as string;
    const { messageId } = req.params;

    const message = await DirectMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.sender.toString() !== userId) {
      return res.status(403).json({ error: 'Cannot delete this message' });
    }

    await DirectMessage.findByIdAndDelete(messageId);
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Block user
router.post('/block/:userId', async (req, res) => {
  try {
    const blockerId = req.headers.userid as string;
    const { userId } = req.params;

    if (blockerId === userId) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already blocked
    const existingBlock = await Block.findOne({
      blocker: blockerId,
      blocked: userId
    });

    if (existingBlock) {
      return res.status(400).json({ error: 'User is already blocked' });
    }

    const block = new Block({
      blocker: blockerId,
      blocked: userId
    });

    await block.save();
    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// Unblock user
router.delete('/block/:userId', async (req, res) => {
  try {
    const blockerId = req.headers.userid as string;
    const { userId } = req.params;

    const result = await Block.findOneAndDelete({
      blocker: blockerId,
      blocked: userId
    });

    if (!result) {
      return res.status(404).json({ error: 'Block not found' });
    }

    res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// Get blocked users
router.get('/blocked', async (req, res) => {
  try {
    const userId = req.headers.userid as string;

    const blocks = await Block.find({ blocker: userId })
      .populate('blocked', 'username avatar')
      .sort({ createdAt: -1 });

    res.json({ blockedUsers: blocks.map(block => block.blocked) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blocked users' });
  }
});

// Search users for new conversation
router.get('/users/search', async (req, res) => {
  try {
    const currentUserId = req.headers.userid as string;
    const query = req.query.q as string;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    // Get blocked users
    const blocks = await Block.find({
      $or: [
        { blocker: currentUserId },
        { blocked: currentUserId }
      ]
    });

    const blockedUserIds = blocks.map(block => 
      block.blocker.toString() === currentUserId ? block.blocked : block.blocker
    );

    const users = await User.find({
      _id: { 
        $ne: currentUserId,
        $nin: blockedUserIds
      },
      username: { $regex: query.trim(), $options: 'i' }
    })
      .select('username avatar isOnline')
      .limit(10);

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search users' });
  }
});

export default router;
