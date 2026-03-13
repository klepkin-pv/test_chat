import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { setupSocketHandlers } from './socket/handlers.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import filesRoutes from './routes/files.js';
import directRoutes from './routes/direct.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const server = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5175",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);
app.use('/files', filesRoutes);
app.use('/direct', directRoutes);
app.use('/admin', adminRoutes);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5175",
    methods: ["GET", "POST"]
  }
});

// Initialize connections
async function startServer() {
  try {
    await connectDB();
    await connectRedis();
    
    setupSocketHandlers(io);
    
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();