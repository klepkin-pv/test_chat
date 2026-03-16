import express from 'express';
import { Favorite } from '../models/Favorite.js';
import { Block } from '../models/Block.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get my favorites
router.get('/favorites', authenticate, async (req: AuthRequest, res) => {
  try {
    console.log('GET /favorites - user:', req.user?.id);
    const favorites = await Favorite.find({ user: req.user!.id })
      .populate('favoriteUser', 'username displayName avatar isOnline role')
      .sort({ createdAt: -1 });

    res.json({ favorites: favorites.map(f => f.favoriteUser) });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Add to favorites
router.post('/favorites/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    console.log('POST /favorites/:userId - adding user:', userId, 'for:', req.user?.id);

    if (userId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot add yourself to favorites' });
    }

    const existing = await Favorite.findOne({
      user: req.user!.id,
      favoriteUser: userId
    });

    if (existing) {
      return res.status(400).json({ error: 'Already in favorites' });
    }

    const favorite = new Favorite({
      user: req.user!.id,
      favoriteUser: userId
    });

    await favorite.save();
    await favorite.populate('favoriteUser', 'username displayName avatar isOnline role');

    console.log('Successfully added to favorites');
    res.json({ message: 'Added to favorites', user: favorite.favoriteUser });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({ error: 'Failed to add to favorites' });
  }
});

// Remove from favorites
router.delete('/favorites/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    await Favorite.deleteOne({
      user: req.user!.id,
      favoriteUser: userId
    });

    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove from favorites' });
  }
});

// Get my blocks
router.get('/blocks', authenticate, async (req: AuthRequest, res) => {
  try {
    const blocks = await Block.find({ blocker: req.user!.id })
      .populate('blocked', 'username displayName avatar isOnline role')
      .sort({ createdAt: -1 });

    res.json({ blocks: blocks.map(b => b.blocked) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blocks' });
  }
});

// Block user
router.post('/blocks/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    const existing = await Block.findOne({
      blocker: req.user!.id,
      blocked: userId
    });

    if (existing) {
      return res.status(400).json({ error: 'Already blocked' });
    }

    const block = new Block({
      blocker: req.user!.id,
      blocked: userId
    });

    await block.save();
    await block.populate('blocked', 'username displayName avatar isOnline role');

    res.json({ message: 'User blocked', user: block.blocked });
  } catch (error) {
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// Unblock user
router.delete('/blocks/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    await Block.deleteOne({
      blocker: req.user!.id,
      blocked: userId
    });

    res.json({ message: 'User unblocked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

export default router;
