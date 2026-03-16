import mongoose from 'mongoose';
import { Room } from '../Room.js';
import { User } from '../User.js';

async function createUser(username: string) {
  return User.create({ username, displayName: username, email: `${username}@test.com`, password: 'password123' });
}

describe('Room Model', () => {
  describe('creation', () => {
    it('should create a room with required fields', async () => {
      const owner = await createUser('owner');
      const room = await Room.create({ name: 'Test Room', owner: owner._id, members: [owner._id], admins: [owner._id] });

      expect(room.name).toBe('Test Room');
      expect(room.isPrivate).toBe(false);
      expect(room.maxMembers).toBe(100);
      expect(room.createdAt).toBeInstanceOf(Date);
    });

    it('should require name', async () => {
      const owner = await createUser('owner');
      await expect(Room.create({ owner: owner._id })).rejects.toThrow();
    });

    it('should require owner', async () => {
      await expect(Room.create({ name: 'No Owner' })).rejects.toThrow();
    });

    it('should enforce name maxlength of 50', async () => {
      const owner = await createUser('owner');
      const longName = 'a'.repeat(51);
      await expect(Room.create({ name: longName, owner: owner._id })).rejects.toThrow();
    });
  });

  describe('private rooms', () => {
    it('should store isPrivate flag', async () => {
      const owner = await createUser('owner');
      const room = await Room.create({ name: 'Private', owner: owner._id, isPrivate: true, password: 'secret' });

      expect(room.isPrivate).toBe(true);
      expect(room.password).toBe('secret');
    });

    it('should default isPrivate to false', async () => {
      const owner = await createUser('owner');
      const room = await Room.create({ name: 'Public', owner: owner._id });
      expect(room.isPrivate).toBe(false);
    });
  });

  describe('members', () => {
    it('should add and remove members', async () => {
      const owner = await createUser('owner');
      const member = await createUser('member');
      const room = await Room.create({ name: 'Room', owner: owner._id, members: [owner._id] });

      room.members.push(member._id as any);
      await room.save();
      expect(room.members).toHaveLength(2);

      room.members = room.members.filter(m => m.toString() !== member._id.toString()) as any;
      await room.save();
      expect(room.members).toHaveLength(1);
    });
  });

  describe('custom reactions', () => {
    it('should store custom reactions array', async () => {
      const owner = await createUser('owner');
      const room = await Room.create({ name: 'Room', owner: owner._id, reactions: ['👍', '❤️', '🔥'] });
      expect(room.reactions).toEqual(['👍', '❤️', '🔥']);
    });

    it('should default reactions to null', async () => {
      const owner = await createUser('owner');
      const room = await Room.create({ name: 'Room', owner: owner._id });
      expect(room.reactions).toBeNull();
    });
  });
});
