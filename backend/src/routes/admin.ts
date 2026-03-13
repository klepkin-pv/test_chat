import express from 'express';
import { User } from '../models/User.js';
import { Ban } from '../models/Ban.js';
import { authenticate, requireRole, protectSuperAdmin, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Изменить роль пользователя (только админы)
router.post('/users/:userId/role', 
  authenticate, 
  requireRole('admin'), 
  protectSuperAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!['user', 'moderator', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      user.role = role;
      await user.save();

      res.json({ 
        success: true, 
        user: {
          id: user._id,
          username: user.username,
          role: user.role
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update role' });
    }
});

// Забанить пользователя (модеры и админы)
router.post('/users/:userId/ban',
  authenticate,
  requireRole('moderator', 'admin'),
  protectSuperAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      const { reason, duration, scope, roomId } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Модеры могут банить только в комнатах
      if (req.user!.role === 'moderator' && scope === 'global') {
        return res.status(403).json({ error: 'Moderators can only ban in rooms' });
      }

      let expiresAt = null;
      if (duration && duration > 0) {
        expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000); // duration в часах
      }

      const ban = new Ban({
        user: userId,
        room: scope === 'room' ? roomId : null,
        bannedBy: req.user!.id,
        reason,
        expiresAt,
        scope: scope || 'room',
        isActive: true
      });

      await ban.save();

      res.json({ success: true, ban });
    } catch (error) {
      res.status(500).json({ error: 'Failed to ban user' });
    }
});

// Разбанить пользователя
router.post('/bans/:banId/unban',
  authenticate,
  requireRole('moderator', 'admin'),
  async (req: AuthRequest, res) => {
    try {
      const { banId } = req.params;

      const ban = await Ban.findById(banId);
      if (!ban) {
        return res.status(404).json({ error: 'Ban not found' });
      }

      ban.isActive = false;
      await ban.save();

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to unban user' });
    }
});

// Получить список банов
router.get('/bans',
  authenticate,
  requireRole('moderator', 'admin'),
  async (req: AuthRequest, res) => {
    try {
      const { roomId, scope } = req.query;

      const query: any = { isActive: true };
      
      if (scope) {
        query.scope = scope;
      }
      
      if (roomId) {
        query.room = roomId;
      }

      const bans = await Ban.find(query)
        .populate('user', 'username displayName')
        .populate('bannedBy', 'username')
        .sort({ createdAt: -1 });

      res.json({ bans });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch bans' });
    }
});

// Проверить, забанен ли пользователь
router.get('/users/:userId/ban-status',
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      const { roomId } = req.query;

      const now = new Date();
      
      // Проверяем глобальный бан
      const globalBan = await Ban.findOne({
        user: userId,
        scope: 'global',
        isActive: true,
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: now } }
        ]
      });

      if (globalBan) {
        return res.json({ 
          isBanned: true, 
          ban: globalBan,
          scope: 'global'
        });
      }

      // Проверяем бан в комнате
      if (roomId) {
        const roomBan = await Ban.findOne({
          user: userId,
          room: roomId,
          scope: 'room',
          isActive: true,
          $or: [
            { expiresAt: null },
            { expiresAt: { $gt: now } }
          ]
        });

        if (roomBan) {
          return res.json({ 
            isBanned: true, 
            ban: roomBan,
            scope: 'room'
          });
        }
      }

      res.json({ isBanned: false });
    } catch (error) {
      res.status(500).json({ error: 'Failed to check ban status' });
    }
});

export default router;
