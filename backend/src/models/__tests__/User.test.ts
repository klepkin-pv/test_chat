import { User } from '../User.js';

const baseUser = {
  username: 'testuser',
  displayName: 'Test User',
  email: 'test@example.com',
  password: 'plainpassword'
};

describe('User Model', () => {
  describe('password hashing', () => {
    it('should hash password before saving', async () => {
      const user = new User(baseUser);
      await user.save();

      expect(user.password).not.toBe('plainpassword');
      expect(user.password.length).toBeGreaterThan(20);
    });

    it('should not re-hash password if not modified', async () => {
      const user = new User(baseUser);
      await user.save();
      const hashed = user.password;

      user.displayName = 'Updated Name';
      await user.save();

      expect(user.password).toBe(hashed);
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const user = new User(baseUser);
      await user.save();
      expect(await user.comparePassword('plainpassword')).toBe(true);
    });

    it('should return false for wrong password', async () => {
      const user = new User(baseUser);
      await user.save();
      expect(await user.comparePassword('wrongpassword')).toBe(false);
    });
  });

  describe('validation', () => {
    it('should require username', async () => {
      await expect(new User({ displayName: 'X', email: 'x@x.com', password: 'pass123' }).save()).rejects.toThrow();
    });

    it('should require displayName', async () => {
      await expect(new User({ username: 'user', email: 'x@x.com', password: 'pass123' }).save()).rejects.toThrow();
    });

    it('should require email', async () => {
      await expect(new User({ username: 'user', displayName: 'X', password: 'pass123' }).save()).rejects.toThrow();
    });

    it('should require unique username', async () => {
      await User.create(baseUser);
      await expect(User.create({ ...baseUser, email: 'other@test.com' })).rejects.toThrow();
    });

    it('should require unique email', async () => {
      await User.create(baseUser);
      await expect(User.create({ ...baseUser, username: 'other' })).rejects.toThrow();
    });
  });

  describe('defaults', () => {
    it('should set default values', async () => {
      const user = new User(baseUser);
      await user.save();

      expect(user.isOnline).toBe(false);
      expect(user.role).toBe('user');
      expect(user.lastSeen).toBeInstanceOf(Date);
      expect(user.createdAt).toBeInstanceOf(Date);
    });
  });
});
