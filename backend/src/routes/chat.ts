import express, { NextFunction, Response } from 'express';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { Room } from '../models/Room.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { Ban } from '../models/Ban.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { handleUploadError, saveImageDataUrl, singleUpload } from '../middleware/upload.js';

const router = express.Router();
const uploadRoomAvatar = singleUpload('avatar');

function parseBooleanInput(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  return undefined;
}

function runRoomAvatarUpload(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.is('multipart/form-data')) {
    next();
    return;
  }

  uploadRoomAvatar(req, res, (error: unknown) => {
    if (error) {
      handleUploadError(res, error);
      return;
    }

    next();
  });
}

function getRoomEditPermissions(room: any, user?: AuthRequest['user']) {
  const isOwner = room.owner.toString() === user?.id;
  const isRoomAdmin = room.admins.some((admin: any) => admin.toString() === user?.id);
  const isGlobalAdmin = user?.role === 'admin';

  return {
    isOwner,
    isRoomAdmin,
    isGlobalAdmin,
    allowed: isOwner || isRoomAdmin || isGlobalAdmin,
  };
}

function replaceRoomAvatar(room: any, file?: Express.Multer.File, avatarDataUrl?: string) {
  if (!file && !avatarDataUrl) {
    return room.avatar;
  }

  if (room.avatar) {
    const oldPath = path.join(process.cwd(), 'uploads', 'images', path.basename(room.avatar));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const avatarUrl = file
    ? `/uploads/images/${file.filename}`
    : saveImageDataUrl(avatarDataUrl!);
  room.avatar = avatarUrl;

  return avatarUrl;
}

// Get all rooms (показываем все комнаты, но пользователь может писать только в тех, где он участник)
router.get('/rooms', async (req, res) => {
  try {
    const userId = req.headers.userid as string;
    
    // Получаем все комнаты
    const rooms = await Room.find({})
      .populate('members', 'username displayName avatar isOnline role')
      .populate('admins', 'username displayName avatar isOnline role')
      .populate('owner', 'username displayName avatar isOnline role')
      .sort({ createdAt: -1 });

    // Добавляем информацию о членстве пользователя
    const roomsWithMembership = rooms.map(room => {
      const obj = room.toObject() as any;
      delete obj.password; // никогда не отдаём пароль клиенту
      return {
        ...obj,
        isMember: room.members.some((m: any) => m._id.toString() === userId)
      };
    });

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
      isPrivate: !!isPrivate,
      password: isPrivate && password ? await bcrypt.hash(password, 10) : null,
      owner: req.user.id,
      members: [req.user.id],
      admins: [req.user.id]
    });

    await room.save();
    await room.populate('members', 'username displayName avatar isOnline role');
    await room.populate('admins', 'username displayName avatar isOnline role');
    await room.populate('owner', 'username displayName avatar isOnline role');

    res.status(201).json({ room });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Join room
router.post('/rooms/:roomId/join', authenticate, async (req: AuthRequest, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user!.id;
    const { password } = req.body;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.members.includes(userId as any)) {
      if (room.isPrivate && room.password) {
        if (!password) {
          return res.status(403).json({ error: 'Password required', requiresPassword: true });
        }
        const isMatch = await bcrypt.compare(password, room.password);
        if (!isMatch) {
          return res.status(403).json({ error: 'Invalid password', requiresPassword: true });
        }
      }
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

// Update room (только админы комнаты или owner)
router.put('/rooms/:roomId', authenticate, runRoomAvatarUpload, async (req: AuthRequest, res) => {
  try {
    const { roomId } = req.params;
    const { name, description, isPrivate, password, avatarDataUrl } = req.body;
    const parsedIsPrivate = parseBooleanInput(isPrivate);
    
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Проверка прав (owner или admin комнаты или глобальный админ)
    const permissions = getRoomEditPermissions(room, req.user);

    if (!permissions.allowed) {
      return res.status(403).json({ error: 'Only room admins can edit this room' });
    }

    if (name) room.name = name;
    if (description !== undefined) room.description = description;
    if (parsedIsPrivate !== undefined) room.isPrivate = parsedIsPrivate;
    if (room.isPrivate && password) room.password = await bcrypt.hash(password, 10);
    if (parsedIsPrivate === false) room.password = undefined;
    replaceRoomAvatar(room, req.file, typeof avatarDataUrl === 'string' ? avatarDataUrl : undefined);

    await room.save();
    await room.populate('members', 'username displayName avatar isOnline role');
    await room.populate('admins', 'username displayName avatar isOnline role');
    await room.populate('owner', 'username displayName avatar isOnline role');

    res.json({ room });
  } catch (error) {
    console.error('PUT /rooms/:roomId - Error:', error);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// Delete room (только owner или глобальный админ)
router.delete('/rooms/:roomId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Проверка прав (только owner или глобальный админ)
    const isOwner = room.owner.toString() === req.user?.id;
    const isGlobalAdmin = req.user?.role === 'admin';

    if (!isOwner && !isGlobalAdmin) {
      return res.status(403).json({ error: 'Only room owner or global admin can delete this room' });
    }

    await Room.findByIdAndDelete(roomId);
    // Также удаляем все сообщения комнаты
    await Message.deleteMany({ room: roomId });
    // Удаляем аватарку комнаты с диска
    if (room.avatar) {
      const oldPath = path.join(process.cwd(), 'uploads', 'images', path.basename(room.avatar));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// Kick user from room (admin/moderator only)
router.post('/rooms/:roomId/kick', authenticate, async (req: AuthRequest, res) => {
  try {
    const { roomId } = req.params;
    const { userId: targetUserId } = req.body;
    const requesterId = req.user!.id;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const isOwner = room.owner.toString() === requesterId;
    const isRoomAdmin = room.admins.some((a: any) => a.toString() === requesterId);
    const isGlobalAdminOrMod = req.user?.role === 'admin' || req.user?.role === 'moderator';

    if (!isOwner && !isRoomAdmin && !isGlobalAdminOrMod) {
      return res.status(403).json({ error: 'No permission to kick users' });
    }

    // Cannot kick owner
    if (room.owner.toString() === targetUserId) {
      return res.status(400).json({ error: 'Cannot kick room owner' });
    }

    room.members = room.members.filter((m: any) => m.toString() !== targetUserId);
    room.admins = room.admins.filter((a: any) => a.toString() !== targetUserId);
    await room.save();

    res.json({ message: 'User kicked successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to kick user' });
  }
});

// Leave room (any member)
router.post('/rooms/:roomId/leave', authenticate, async (req: AuthRequest, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user!.id;

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    if (room.owner.toString() === userId) {
      return res.status(400).json({ error: 'Room owner cannot leave. Delete the room instead.' });
    }

    room.members = room.members.filter((m: any) => m.toString() !== userId);
    room.admins = room.admins.filter((a: any) => a.toString() !== userId);
    await room.save();

    res.json({ message: 'Left room successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to leave room' });
  }
});

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

// Upload room avatar (admin only)
router.post('/rooms/:roomId/avatar', authenticate, (req: AuthRequest, res, next) => {
  uploadRoomAvatar(req, res, (error: unknown) => {
    if (error) {
      return handleUploadError(res, error);
    }

    next();
  });
}, async (req: AuthRequest, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const permissions = getRoomEditPermissions(room, req.user);
    if (!permissions.allowed) return res.status(403).json({ error: 'Access denied' });

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const avatarUrl = replaceRoomAvatar(room, req.file);
    await room.save();
    res.json({ avatar: avatarUrl });
  } catch (error) {
    console.error('Room avatar upload failed:', error);
    res.status(500).json({ error: 'Failed to update room avatar' });
  }
});

export default router;
