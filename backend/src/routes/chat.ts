import express from 'express';
import { Room } from '../models/Room.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { Ban } from '../models/Ban.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get all rooms (показываем все комнаты, но пользователь может писать только в тех, где он участник)
router.get('/rooms', async (req, res) => {
  try {
    const userId = req.headers.userid as string;
    
    // Получаем все комнаты
    const rooms = await Room.find({})
      .populate('members', 'username avatar isOnline')
      .sort({ createdAt: -1 });

    // Добавляем информацию о членстве пользователя
    const roomsWithMembership = rooms.map(room => ({
      ...room.toObject(),
      isMember: room.members.some((m: any) => m._id.toString() === userId)
    }));

    res.json({ rooms: roomsWithMembership });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Create room (только админы)
router.post('/rooms', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, description, isPrivate, password } = req.body;
    
    // Проверка роли админа
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create rooms' });
    }

    const room = new Room({
      name,
      description,
      isPrivate,
      password,
      owner: req.user.id,
      members: [req.user.id],
      admins: [req.user.id]
    });

    await room.save();
    await room.populate('members', 'username avatar isOnline');

    res.status(201).json({ room });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Join room
router.post('/rooms/:roomId/join', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.headers.userid as string;
    const { password } = req.body;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.isPrivate && room.password !== password) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    if (!room.members.includes(userId as any)) {
      room.members.push(userId as any);
      await room.save();
    }

    res.json({ message: 'Joined room successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Get room messages
router.get('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;

    let query: any = { room: roomId };
    
    // Add search filter if provided
    if (search) {
      query.content = { $regex: search, $options: 'i' };
    }

    const messages = await Message.find(query)
      .populate('sender', 'username avatar')
      .populate('replyTo', 'content sender')
      .sort({ createdAt: -1 })
      .limit(limit * page)
      .skip((page - 1) * limit);

    res.json({ messages: messages.reverse() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Search messages in room
router.get('/rooms/:roomId/search', async (req, res) => {
  try {
    const { roomId } = req.params;
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const messages = await Message.find({
      room: roomId,
      content: { $regex: query.trim(), $options: 'i' }
    })
      .populate('sender', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ messages, query: query.trim() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

// Search messages (POST endpoint for frontend)
router.post('/search', async (req, res) => {
  try {
    const { roomId, query } = req.body;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const messages = await Message.find({
      room: roomId,
      content: { $regex: query.trim(), $options: 'i' }
    })
      .populate('sender', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ messages, query: query.trim() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

export default router;
// Get room members
router.get('/rooms/:roomId/members', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.headers.userid as string;

    const room = await Room.findById(roomId).populate('members', 'username avatar isOnline');
    if (!room || !room.members.some(member => member._id.toString() === userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ members: room.members });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Manage user roles (promote/demote admin)
router.post('/rooms/:roomId/roles', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId: targetUserId, action } = req.body;
    const userId = req.headers.userid as string;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Only owner can manage roles
    if (room.owner.toString() !== userId) {
      return res.status(403).json({ error: 'Only room owner can manage roles' });
    }

    // Can't change owner's role
    if (room.owner.toString() === targetUserId) {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }

    if (action === 'promote') {
      if (!room.admins.includes(targetUserId as any)) {
        room.admins.push(targetUserId as any);
      }
    } else if (action === 'demote') {
      room.admins = room.admins.filter(admin => admin.toString() !== targetUserId);
    }

    await room.save();
    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Ban user from room
router.post('/rooms/:roomId/ban', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId: targetUserId, reason, expiresAt } = req.body;
    const userId = req.headers.userid as string;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user has admin rights
    const isAdmin = room.admins.includes(userId as any) || room.owner.toString() === userId;
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin rights required' });
    }

    // Can't ban owner or other admins (unless you're the owner)
    const isTargetAdmin = room.admins.includes(targetUserId as any) || room.owner.toString() === targetUserId;
    if (isTargetAdmin && room.owner.toString() !== userId) {
      return res.status(403).json({ error: 'Cannot ban admins or owner' });
    }

    // Can't ban yourself
    if (targetUserId === userId) {
      return res.status(400).json({ error: 'Cannot ban yourself' });
    }

    // Check if user is already banned
    const existingBan = await Ban.findOne({
      user: targetUserId,
      room: roomId,
      isActive: true
    });

    if (existingBan) {
      return res.status(400).json({ error: 'User is already banned' });
    }

    // Create ban
    const ban = new Ban({
      user: targetUserId,
      room: roomId,
      bannedBy: userId,
      reason,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });

    await ban.save();

    // Remove user from room members
    room.members = room.members.filter(member => member.toString() !== targetUserId);
    room.admins = room.admins.filter(admin => admin.toString() !== targetUserId);
    await room.save();

    res.json({ message: 'User banned successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

// Get room bans
router.get('/rooms/:roomId/bans', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.headers.userid as string;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user has admin rights
    const isAdmin = room.admins.includes(userId as any) || room.owner.toString() === userId;
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin rights required' });
    }

    const bans = await Ban.find({
      room: roomId,
      isActive: true,
      $or: [
        { expiresAt: null }, // Permanent bans
        { expiresAt: { $gt: new Date() } } // Non-expired bans
      ]
    })
      .populate('user', 'username avatar')
      .populate('bannedBy', 'username')
      .sort({ createdAt: -1 });

    res.json({ bans });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bans' });
  }
});

// Unban user
router.post('/bans/:banId/unban', async (req, res) => {
  try {
    const { banId } = req.params;
    const userId = req.headers.userid as string;

    const ban = await Ban.findById(banId).populate('room');
    if (!ban) {
      return res.status(404).json({ error: 'Ban not found' });
    }

    const room = await Room.findById(ban.room);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user has admin rights
    const isAdmin = room.admins.includes(userId as any) || room.owner.toString() === userId;
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin rights required' });
    }

    ban.isActive = false;
    await ban.save();

    res.json({ message: 'User unbanned successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// Middleware to check if user is banned (to be used in socket handlers)
export const checkUserBan = async (userId: string, roomId: string): Promise<boolean> => {
  try {
    const activeBan = await Ban.findOne({
      user: userId,
      room: roomId,
      isActive: true,
      $or: [
        { expiresAt: null }, // Permanent ban
        { expiresAt: { $gt: new Date() } } // Non-expired ban
      ]
    });

    return !!activeBan;
  } catch (error) {
    console.error('Error checking ban:', error);
    return false;
  }
};