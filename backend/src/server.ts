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
import favoritesRoutes from './routes/favorites.js';
import pushRoutes from './routes/push.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const server = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.CLIENT_URL || "http://localhost:5175",
    "https://worksource.share.zrok.io",
    "http://localhost:5176"
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Routes
app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);
app.use('/files', filesRoutes);
app.use('/direct', directRoutes);
app.use('/admin', adminRoutes);
app.use('/user', favoritesRoutes);
app.use('/push', pushRoutes);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL || "http://localhost:5175",
      "https://worksource.share.zrok.io",
      "http://localhost:5176"
    ],
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