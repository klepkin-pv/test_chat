import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { User } from '../models/User.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// JWT Authentication middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_base_for_dev') as any;
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, displayName, email, password } = req.body;

    // Validate required fields
    if (!username || !displayName || !email || !password) {
      return res.status(400).json({
        error: 'Username, display name, email, and password are required'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User with this email or username already exists'
      });
    }

    // Create user (password will be hashed by pre-save hook)
    const user = new User({
      username,
      displayName,
      email,
      password
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'secret_base_for_dev',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate required fields
    if (!password || (!username && !email)) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    // Find user by username or email (case-insensitive)
    const user = await User.findOne({
      $or: [
        ...(username ? [{ username: { $regex: new RegExp(`^${username}$`, 'i') } }] : []),
        ...(email ? [{ email: { $regex: new RegExp(`^${email}$`, 'i') } }] : [])
      ]
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password using the model method
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'secret_base_for_dev',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: any, res) => {
  try {
    const user = req.user;
    res.json({
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update profile
router.put('/profile', authenticateToken, async (req: any, res) => {
  try {
    const { displayName, email, password } = req.body;
    const user = req.user;

    if (displayName !== undefined) user.displayName = displayName;
    if (email) user.email = email;
    if (password) user.password = password; // Will be hashed by pre-save hook

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during profile update' });
  }
});

// Get user info by ID
router.get('/users/:userId', authenticateToken, async (req: any, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password -email');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        role: user.role,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload user avatar
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const user = req.user;
    // Delete old avatar file if exists
    if (user.avatar) {
      const oldPath = path.join(process.cwd(), 'uploads', 'images', path.basename(user.avatar));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    const avatarUrl = `/uploads/images/${req.file.filename}`;
    user.avatar = avatarUrl;
    await user.save();
    res.json({ avatar: avatarUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

export default router;