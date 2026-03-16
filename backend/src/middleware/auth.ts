import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: 'user' | 'moderator' | 'admin';
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_base_for_dev') as any;
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      id: user._id.toString(),
      username: user.username,
      role: user.role
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (...roles: Array<'user' | 'moderator' | 'admin'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Защита супер-админа
export const protectSuperAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const targetUserId = req.body.userId || req.params.userId;
  
  if (targetUserId) {
    const targetUser = await User.findById(targetUserId);
    
    if (targetUser && targetUser.username === 'admin' && targetUser.role === 'admin') {
      return res.status(403).json({ error: 'Cannot modify super admin' });
    }
  }

  next();
};
