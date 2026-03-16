import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { PushSubscription } from '../models/PushSubscription.js';

const router = Router();

// GET /push/vapid-public-key — фронт получает публичный ключ
router.get('/vapid-public-key', (_req, res: Response) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /push/subscribe — сохранить подписку
router.post('/subscribe', authenticate, async (req: AuthRequest, res: Response) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Invalid subscription data' });
  }

  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { user: req.user!.id, endpoint, keys },
    { upsert: true, new: true }
  );

  res.json({ success: true });
});

// DELETE /push/unsubscribe — удалить подписку
router.delete('/unsubscribe', authenticate, async (req: AuthRequest, res: Response) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'Endpoint required' });

  await PushSubscription.deleteOne({ endpoint, user: req.user!.id });
  res.json({ success: true });
});

export default router;
