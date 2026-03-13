import { Server, Socket } from 'socket.io';
import { Message } from '../models/Message.js';
import { DirectMessage } from '../models/DirectMessage.js';
import { Room } from '../models/Room.js';
import { User } from '../models/User.js';
import { Block } from '../models/Block.js';
import { redisClient } from '../config/redis.js';
import { checkUserBan } from '../routes/chat.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.id}`);

    // Authentication
    socket.on('authenticate', async (data: { userId: string, username: string }) => {
      try {
        socket.userId = data.userId;
        socket.username = data.username;
        
        // Update user online status
        await User.findByIdAndUpdate(data.userId, { 
          isOnline: true,
          lastSeen: new Date()
        });
        
        // Store user socket mapping in Redis
        await redisClient.set(`user:${data.userId}`, socket.id);
        
        socket.emit('authenticated', { success: true });
        console.log(`User authenticated: ${data.username}`);
      } catch (error) {
        socket.emit('authenticated', { success: false, error: 'Authentication failed' });
      }
    });

    // Join room
    socket.on('join_room', async (roomId: string) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        // Check if user is banned
        const isBanned = await checkUserBan(socket.userId, roomId);
        if (isBanned) {
          socket.emit('error', { message: 'You are banned from this room' });
          return;
        }

        const room = await Room.findById(roomId);
        if (!room || !room.members.includes(socket.userId as any)) {
          socket.emit('error', { message: 'Access denied to room' });
          return;
        }

        socket.join(roomId);
        
        // Get recent messages
        const messages = await Message.find({ room: roomId })
          .populate('sender', 'username avatar')
          .sort({ createdAt: -1 })
          .limit(50);

        socket.emit('room_joined', { 
          roomId, 
          messages: messages.reverse() 
        });

        // Notify others about user joining
        socket.to(roomId).emit('user_joined', {
          userId: socket.userId,
          username: socket.username
        });

      } catch (error) {
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Send message
    socket.on('send_message', async (data: {
      roomId: string;
      content: string;
      messageType?: 'text' | 'file' | 'image';
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      thumbnailUrl?: string;
      replyTo?: string;
    }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        // Check if user is banned
        const isBanned = await checkUserBan(socket.userId, data.roomId);
        if (isBanned) {
          socket.emit('error', { message: 'You are banned from this room' });
          return;
        }

        const message = new Message({
          content: data.content,
          sender: socket.userId,
          room: data.roomId,
          messageType: data.messageType || 'text',
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
          replyTo: data.replyTo
        });

        await message.save();
        await message.populate('sender', 'username avatar');

        // Send to all users in the room
        io.to(data.roomId).emit('new_message', message);

      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicators
    socket.on('typing_start', (roomId: string) => {
      socket.to(roomId).emit('user_typing', {
        userId: socket.userId,
        username: socket.username
      });
    });

    socket.on('typing_stop', (roomId: string) => {
      socket.to(roomId).emit('user_stop_typing', {
        userId: socket.userId
      });
    });

    // Message reactions
    socket.on('add_reaction', async (data: {
      messageId: string;
      emoji: string;
    }) => {
      try {
        if (!socket.userId) return;

        const message = await Message.findById(data.messageId);
        if (!message) return;

        // Remove existing reaction from this user
        message.reactions = message.reactions.filter(
          r => r.user.toString() !== socket.userId
        );

        // Add new reaction
        message.reactions.push({
          user: socket.userId as any,
          emoji: data.emoji
        });

        await message.save();

        io.to(message.room.toString()).emit('reaction_added', {
          messageId: data.messageId,
          reactions: message.reactions
        });

      } catch (error) {
        socket.emit('error', { message: 'Failed to add reaction' });
      }
    });

    // Remove reaction
    socket.on('remove_reaction', async (data: {
      messageId: string;
    }) => {
      try {
        if (!socket.userId) return;

        const message = await Message.findById(data.messageId);
        if (!message) return;

        // Remove reaction from this user
        message.reactions = message.reactions.filter(
          r => r.user.toString() !== socket.userId
        );

        await message.save();

        io.to(message.room.toString()).emit('reaction_removed', {
          messageId: data.messageId,
          reactions: message.reactions
        });

      } catch (error) {
        socket.emit('error', { message: 'Failed to remove reaction' });
      }
    });

    // Edit message
    socket.on('edit_message', async (data: {
      messageId: string;
      newContent: string;
    }) => {
      try {
        if (!socket.userId) return;

        const message = await Message.findById(data.messageId);
        if (!message || message.sender.toString() !== socket.userId) {
          socket.emit('error', { message: 'Cannot edit this message' });
          return;
        }

        // Don't allow editing file messages
        if (message.messageType !== 'text') {
          socket.emit('error', { message: 'Cannot edit file messages' });
          return;
        }

        message.content = data.newContent;
        message.isEdited = true;
        message.editedAt = new Date();

        await message.save();
        await message.populate('sender', 'username avatar');

        io.to(message.room.toString()).emit('message_edited', message);

      } catch (error) {
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    // Delete message
    socket.on('delete_message', async (data: {
      messageId: string;
    }) => {
      try {
        if (!socket.userId) return;

        const message = await Message.findById(data.messageId);
        if (!message || message.sender.toString() !== socket.userId) {
          socket.emit('error', { message: 'Cannot delete this message' });
          return;
        }

        await Message.findByIdAndDelete(data.messageId);

        io.to(message.room.toString()).emit('message_deleted', {
          messageId: data.messageId
        });

      } catch (error) {
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // Disconnect handler
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.id}`);
      
      if (socket.userId) {
        // Update user offline status
        await User.findByIdAndUpdate(socket.userId, {
          isOnline: false,
          lastSeen: new Date()
        });
        
        // Remove from Redis
        await redisClient.del(`user:${socket.userId}`);
      }
    });

    // Direct message handlers
    socket.on('send_direct_message', async (data: {
      recipientId: string;
      content: string;
      messageType?: 'text' | 'file' | 'image';
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      thumbnailUrl?: string;
      replyTo?: string;
    }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        // Check if users are blocked
        const isBlocked = await Block.findOne({
          $or: [
            { blocker: socket.userId, blocked: data.recipientId },
            { blocker: data.recipientId, blocked: socket.userId }
          ]
        });

        if (isBlocked) {
          socket.emit('error', { message: 'Cannot send message to blocked user' });
          return;
        }

        const message = new DirectMessage({
          content: data.content,
          sender: socket.userId,
          recipient: data.recipientId,
          messageType: data.messageType || 'text',
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
          thumbnailUrl: data.thumbnailUrl,
          replyTo: data.replyTo
        });

        await message.save();
        await message.populate('sender', 'username avatar');
        await message.populate('recipient', 'username avatar');

        // Send to sender
        socket.emit('new_direct_message', message);

        // Send to recipient if online
        const recipientSocketId = await redisClient.get(`user:${data.recipientId}`);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('new_direct_message', message);
        }

      } catch (error) {
        socket.emit('error', { message: 'Failed to send direct message' });
      }
    });

    // Edit direct message
    socket.on('edit_direct_message', async (data: {
      messageId: string;
      newContent: string;
    }) => {
      try {
        if (!socket.userId) return;

        const message = await DirectMessage.findById(data.messageId);
        if (!message || message.sender.toString() !== socket.userId) {
          socket.emit('error', { message: 'Cannot edit this message' });
          return;
        }

        if (message.messageType !== 'text') {
          socket.emit('error', { message: 'Cannot edit file messages' });
          return;
        }

        message.content = data.newContent;
        message.isEdited = true;
        message.editedAt = new Date();

        await message.save();
        await message.populate('sender', 'username avatar');
        await message.populate('recipient', 'username avatar');

        // Send to both users
        socket.emit('direct_message_edited', message);
        
        const recipientSocketId = await redisClient.get(`user:${message.recipient.toString()}`);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('direct_message_edited', message);
        }

      } catch (error) {
        socket.emit('error', { message: 'Failed to edit direct message' });
      }
    });

    // Delete direct message
    socket.on('delete_direct_message', async (data: {
      messageId: string;
    }) => {
      try {
        if (!socket.userId) return;

        const message = await DirectMessage.findById(data.messageId);
        if (!message || message.sender.toString() !== socket.userId) {
          socket.emit('error', { message: 'Cannot delete this message' });
          return;
        }

        const recipientId = message.recipient.toString();
        await DirectMessage.findByIdAndDelete(data.messageId);

        // Send to both users
        socket.emit('direct_message_deleted', { messageId: data.messageId });
        
        const recipientSocketId = await redisClient.get(`user:${recipientId}`);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('direct_message_deleted', { messageId: data.messageId });
        }

      } catch (error) {
        socket.emit('error', { message: 'Failed to delete direct message' });
      }
    });

    // Mark direct messages as read
    socket.on('mark_direct_messages_read', async (data: {
      senderId: string;
    }) => {
      try {
        if (!socket.userId) return;

        await DirectMessage.updateMany(
          {
            sender: data.senderId,
            recipient: socket.userId,
            isRead: false
          },
          {
            isRead: true,
            readAt: new Date()
          }
        );

        // Notify sender that messages were read
        const senderSocketId = await redisClient.get(`user:${data.senderId}`);
        if (senderSocketId) {
          io.to(senderSocketId).emit('direct_messages_read', {
            readBy: socket.userId
          });
        }

      } catch (error) {
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    // Direct message reactions
    socket.on('add_direct_reaction', async (data: {
      messageId: string;
      emoji: string;
    }) => {
      try {
        if (!socket.userId) return;

        const message = await DirectMessage.findById(data.messageId);
        if (!message) return;

        // Check if user is part of this conversation
        if (message.sender.toString() !== socket.userId && message.recipient.toString() !== socket.userId) {
          return;
        }

        // Remove existing reaction from this user
        message.reactions = message.reactions.filter(
          r => r.user.toString() !== socket.userId
        );

        // Add new reaction
        message.reactions.push({
          user: socket.userId as any,
          emoji: data.emoji
        });

        await message.save();

        // Send to both users
        const otherUserId = message.sender.toString() === socket.userId 
          ? message.recipient.toString() 
          : message.sender.toString();

        socket.emit('direct_reaction_added', {
          messageId: data.messageId,
          reactions: message.reactions
        });

        const otherSocketId = await redisClient.get(`user:${otherUserId}`);
        if (otherSocketId) {
          io.to(otherSocketId).emit('direct_reaction_added', {
            messageId: data.messageId,
            reactions: message.reactions
          });
        }

      } catch (error) {
        socket.emit('error', { message: 'Failed to add reaction' });
      }
    });

    // Remove direct message reaction
    socket.on('remove_direct_reaction', async (data: {
      messageId: string;
    }) => {
      try {
        if (!socket.userId) return;

        const message = await DirectMessage.findById(data.messageId);
        if (!message) return;

        // Check if user is part of this conversation
        if (message.sender.toString() !== socket.userId && message.recipient.toString() !== socket.userId) {
          return;
        }

        // Remove reaction from this user
        message.reactions = message.reactions.filter(
          r => r.user.toString() !== socket.userId
        );

        await message.save();

        // Send to both users
        const otherUserId = message.sender.toString() === socket.userId 
          ? message.recipient.toString() 
          : message.sender.toString();

        socket.emit('direct_reaction_removed', {
          messageId: data.messageId,
          reactions: message.reactions
        });

        const otherSocketId = await redisClient.get(`user:${otherUserId}`);
        if (otherSocketId) {
          io.to(otherSocketId).emit('direct_reaction_removed', {
            messageId: data.messageId,
            reactions: message.reactions
          });
        }

      } catch (error) {
        socket.emit('error', { message: 'Failed to remove reaction' });
      }
    });
  });
};