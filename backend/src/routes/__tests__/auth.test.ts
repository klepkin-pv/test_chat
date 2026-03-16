import request from 'supertest';
import express from 'express';
import authRoutes from '../auth.js';
import { User } from '../../models/User.js';

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

const validUser = {
  username: 'testuser',
  displayName: 'Test User',
  email: 'test@example.com',
  password: 'password123'
};

describe('Auth Routes', () => {
  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app).post('/auth/register').send(validUser).expect(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.username).toBe('testuser');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app).post('/auth/register').send({ username: 'x' }).expect(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for duplicate username', async () => {
      await User.create(validUser);
      const res = await request(app)
        .post('/auth/register')
        .send({ ...validUser, email: 'other@test.com' })
        .expect(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await User.create(validUser);
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ username: 'testuser', password: 'password123' })
        .expect(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.username).toBe('testuser');
    });

    it('should be case-insensitive for username', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ username: 'TESTUSER', password: 'password123' })
        .expect(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should return 400 for wrong password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ username: 'testuser', password: 'wrongpass' })
        .expect(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for unknown user', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ username: 'nobody', password: 'password123' })
        .expect(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 400 for missing password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ username: 'testuser' })
        .expect(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /auth/me', () => {
    let token: string;

    beforeEach(async () => {
      const res = await request(app).post('/auth/register').send(validUser);
      token = res.body.token;
    });

    it('should return user data with valid token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.user.username).toBe('testuser');
    });

    it('should return 401 without token', async () => {
      await request(app).get('/auth/me').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer badtoken')
        .expect(401);
    });
  });
});
