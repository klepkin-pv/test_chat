import { User } from '../User.js';
import bcrypt from 'bcryptjs';

describe('User Model', () => {
  describe('password hashing', () => {
    it('should hash password before saving', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'plainpassword'
      };

      const user = new User(userData);
      await user.save();

      expect(user.password).not.toBe('plainpassword');
      expect(user.password.length).toBeGreaterThan(20); // bcrypt hash length
    });

    it('should not hash password if not modified', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'plainpassword'
      });
      await user.save();

      const hashedPassword = user.password;
      
      // Update username without changing password
      user.username = 'updateduser';
      await user.save();

      expect(user.password).toBe(hashedPassword);
    });
  });

  describe('comparePassword method', () => {
    it('should return true for correct password', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'correctpassword'
      });
      await user.save();

      const isMatch = await user.comparePassword('correctpassword');
      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'correctpassword'
      });
      await user.save();

      const isMatch = await user.comparePassword('wrongpassword');
      expect(isMatch).toBe(false);
    });
  });

  describe('validation', () => {
    it('should require username', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'password'
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should require email', async () => {
      const user = new User({
        username: 'testuser',
        password: 'password'
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should require password', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com'
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should require unique username', async () => {
      await User.create({
        username: 'testuser',
        email: 'test1@example.com',
        password: 'password'
      });

      const duplicateUser = new User({
        username: 'testuser',
        email: 'test2@example.com',
        password: 'password'
      });

      await expect(duplicateUser.save()).rejects.toThrow();
    });

    it('should require unique email', async () => {
      await User.create({
        username: 'testuser1',
        email: 'test@example.com',
        password: 'password'
      });

      const duplicateUser = new User({
        username: 'testuser2',
        email: 'test@example.com',
        password: 'password'
      });

      await expect(duplicateUser.save()).rejects.toThrow();
    });
  });

  describe('default values', () => {
    it('should set default values correctly', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password'
      });
      await user.save();

      expect(user.isOnline).toBe(false);
      expect(user.lastSeen).toBeInstanceOf(Date);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });
  });
});