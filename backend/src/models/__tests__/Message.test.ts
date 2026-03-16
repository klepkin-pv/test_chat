import mongoose from 'mongoose';
import { Message } from '../Message.js';
import { User } from '../User.js';
import { Room } from '../Room.js';

async function setup() {
  const user = await User.create({ username: 'sender', displayName: 'Sender', email: 'sender@test.com', password: 'pass123' });
  const room = await Room.create({ name: 'Room', owner: user._id, members: [user._id] });
  return { user, room };
}

describe('Message Model', () => {
  describe('creation', () => {
    it('should create a text message', async () => {
      const { user, room } = await setup();
      const msg = await Message.create({ content: 'Hello', sender: user._id, room: room._id });

      expect(msg.content).toBe('Hello');
      expect(msg.messageType).toBe('text');
      expect(msg.isEdited).toBe(false);
      expect(msg.isDeleted).toBe(false);
      expect(msg.reactions).toHaveLength(0);
    });

    it('should require content', async () => {
      const { user, room } = await setup();
      await expect(Message.create({ sender: user._id, room: room._id })).rejects.toThrow();
    });

    it('should require sender', async () => {
      const { room } = await setup();
      await expect(Message.create({ content: 'Hi', room: room._id })).rejects.toThrow();
    });

    it('should enforce content maxlength of 2000', async () => {
      const { user, room } = await setup();
      const longContent = 'a'.repeat(2001);
      await expect(Message.create({ content: longContent, sender: user._id, room: room._id })).rejects.toThrow();
    });
  });

  describe('message types', () => {
    it('should accept image type', async () => {
      const { user, room } = await setup();
      const msg = await Message.create({ content: '📷 photo.jpg', sender: user._id, room: room._id, messageType: 'image', fileUrl: '/uploads/images/photo.jpg' });
      expect(msg.messageType).toBe('image');
    });

    it('should reject invalid messageType', async () => {
      const { user, room } = await setup();
      await expect(Message.create({ content: 'x', sender: user._id, room: room._id, messageType: 'invalid' })).rejects.toThrow();
    });
  });

  describe('reactions', () => {
    it('should add reactions', async () => {
      const { user, room } = await setup();
      const msg = await Message.create({ content: 'Hi', sender: user._id, room: room._id });

      msg.reactions.push({ user: user._id as any, emoji: '👍' });
      await msg.save();

      expect(msg.reactions).toHaveLength(1);
      expect(msg.reactions[0].emoji).toBe('👍');
    });
  });

  describe('edit and delete flags', () => {
    it('should mark message as edited', async () => {
      const { user, room } = await setup();
      const msg = await Message.create({ content: 'Original', sender: user._id, room: room._id });

      msg.content = 'Edited';
      msg.isEdited = true;
      msg.editedAt = new Date();
      await msg.save();

      expect(msg.isEdited).toBe(true);
      expect(msg.editedAt).toBeInstanceOf(Date);
    });

    it('should mark message as deleted', async () => {
      const { user, room } = await setup();
      const msg = await Message.create({ content: 'Bye', sender: user._id, room: room._id });

      msg.isDeleted = true;
      msg.deletedAt = new Date();
      await msg.save();

      expect(msg.isDeleted).toBe(true);
    });
  });
});
