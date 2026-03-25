import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { getAllowedOriginPatterns, getAllowedOrigins, getBackendPort, isAllowedOrigin } from './config/app.js';
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
import { errorHandler, notFoundHandler, requestContextMiddleware } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { ensureAdminFromEnv } from './bootstrap/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

function corsOriginHandler(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void): void {
  if (isAllowedOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`CORS blocked for origin: ${origin}`));
}

// Middleware
app.use(requestContextMiddleware);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: corsOriginHandler,
  credentials: true
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);
app.use('/files', filesRoutes);
app.use('/direct', directRoutes);
app.use('/admin', adminRoutes);
app.use('/user', favoritesRoutes);
app.use('/push', pushRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: corsOriginHandler,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize connections
async function startServer() {
  try {
    await connectDB();
    await ensureAdminFromEnv();
    await connectRedis();

    setupSocketHandlers(io);

    const backendPort = getBackendPort();
    const allowedOrigins = getAllowedOrigins();
    const allowedOriginPatterns = getAllowedOriginPatterns();

    server.listen(backendPort, () => {
      logger.info(`Server running on port ${backendPort}`);
      logger.info(`Allowed origins: ${allowedOrigins.join(', ')}`);
      if (allowedOriginPatterns.length > 0) {
        logger.info(`Allowed origin patterns: ${allowedOriginPatterns.join(', ')}`);
      }
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
});

startServer();
