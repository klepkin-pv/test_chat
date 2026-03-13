import request from 'supertest';
import express from 'express';
import authRoutes from '../auth';
import { User } from '../../models/User';

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Auth Routes', () => {
  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        username: 'testuser',
        email: 'test@example.com'
      });
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser'
          // missing email and password
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for duplicate username', async () => {
      // Create first user
      await User.create({
        username: 'testuser',
        email: 'test1@example.com',
        password: 'password123'
      });

      // Try to create user with same username
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test2@example.com',
          password: 'password123'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        username: 'testuser',
        email: 'test@example.com'
      });
    });

    it('should return 400 for invalid username', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'testuser'
          // missing password
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /auth/me', () => {
    let token: string;
    let userId: string;

    beforeEach(async () => {
      // Register and get token
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

      token = response.body.token;
      userId = response.body.user.id;
    });

    it('should return user data with valid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user).toMatchObject({
        id: userId,
        username: 'testuser',
        email: 'test@example.com'
      });
    });

    it('should return 401 for missing token', async () => {
      await request(app)
        .get('/auth/me')
        .expect(401);
    });

    it('should return 401 for invalid token', async () => {
      await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);
    });
  });
});