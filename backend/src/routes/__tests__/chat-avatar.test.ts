import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import chatRoutes from '../chat.js';
import { Room } from '../../models/Room.js';
import { User } from '../../models/User.js';

function createToken(userId: string) {
  return jwt.sign(
    { userId, username: 'admin' },
    process.env.JWT_SECRET || 'secret_base_for_dev',
    { expiresIn: '1h' }
  );
}

describe('Chat room avatar upload', () => {
  const app = express();

  app.use(express.json());
  app.use('/chat', chatRoutes);

  it('uploads a room avatar for a room admin', async () => {
    const user = await User.create({
      username: 'admin',
      displayName: 'Admin',
      email: 'admin@example.com',
      password: '123123',
      role: 'admin',
    });

    const room = await Room.create({
      name: 'Birds',
      description: 'Bird room',
      owner: user._id,
      admins: [user._id],
      members: [user._id],
    });

    const token = createToken(user._id.toString());

    const response = await request(app)
      .post(`/chat/rooms/${room._id.toString()}/avatar`)
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', Buffer.from('fake png payload'), {
        filename: 'avatar.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(200);
    expect(response.body.avatar).toMatch(/^\/uploads\/images\//);

    const updatedRoom = await Room.findById(room._id);
    expect(updatedRoom?.avatar).toBe(response.body.avatar);
  });

  it('updates room info and avatar in a single JSON PUT request', async () => {
    const user = await User.create({
      username: 'roomadmin',
      displayName: 'Room Admin',
      email: 'roomadmin@example.com',
      password: '123123',
      role: 'admin',
    });

    const room = await Room.create({
      name: 'Old birds',
      description: 'Old description',
      owner: user._id,
      admins: [user._id],
      members: [user._id],
      isPrivate: false,
    });

    const token = createToken(user._id.toString());

    const response = await request(app)
      .put(`/chat/rooms/${room._id.toString()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'New birds',
        description: 'Updated description',
        isPrivate: false,
        avatarDataUrl: 'data:image/png;base64,ZmFrZSBwbmcgcGF5bG9hZA==',
      });

    expect(response.status).toBe(200);
    expect(response.body.room.name).toBe('New birds');
    expect(response.body.room.description).toBe('Updated description');
    expect(response.body.room.avatar).toMatch(/^\/uploads\/images\//);

    const updatedRoom = await Room.findById(room._id);
    expect(updatedRoom?.name).toBe('New birds');
    expect(updatedRoom?.description).toBe('Updated description');
    expect(updatedRoom?.isPrivate).toBe(false);
    expect(updatedRoom?.avatar).toBe(response.body.room.avatar);
  });
});
