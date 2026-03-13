import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface Message {
  _id: string;
  content: string;
  sender: {
    _id: string;
    username: string;
    avatar?: string;
  };
  room: string;
  messageType: 'text' | 'file' | 'image' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  thumbnailUrl?: string;
  reactions: Array<{
    user: string;
    emoji: string;
  }>;
  replyTo?: string;
  isEdited?: boolean;
  editedAt?: string;
  createdAt: string;
}

interface Room {
  _id: string;
  name: string;
  description?: string;
  members: Array<{
    _id: string;
    username: string;
    avatar?: string;
    isOnline: boolean;
  }>;
}

interface ChatState {
  socket: Socket | null;
  rooms: Room[];
  currentRoom: Room | null;
  messages: Message[];
  typingUsers: string[];
  isConnected: boolean;
  unreadCounts: Record<string, number>; // roomId -> count
  connect: (token: string, userId: string, username: string) => void;
  disconnect: () => void;
  joinRoom: (roomId: string) => void;
  sendMessage: (content: string, fileData?: {
    messageType?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    thumbnailUrl?: string;
  }, replyTo?: string) => void;
  addReaction: (messageId: string, emoji: string) => void;
  removeReaction: (messageId: string) => void;
  editMessage: (messageId: string, newContent: string) => void;
  deleteMessage: (messageId: string) => void;
  searchMessages: (roomId: string, query: string) => Promise<Message[]>;
  setRooms: (rooms: Room[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  removeMessage: (messageId: string) => void;
  updateMessageReactions: (messageId: string, reactions: Array<{user: string; emoji: string}>) => void;
  markRoomAsRead: (roomId: string) => void;
  incrementUnreadCount: (roomId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  rooms: [],
  currentRoom: null,
  messages: [],
  typingUsers: [],
  isConnected: false,
  unreadCounts: {},

  connect: (token, userId, username) => {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000', {
      auth: { token }
    });

    socket.on('connect', () => {
      set({ isConnected: true });
      socket.emit('authenticate', { userId, username });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('new_message', (message: Message) => {
      const { currentRoom } = get();
      get().addMessage(message);
      
      // Increment unread count if not in current room
      if (!currentRoom || currentRoom._id !== message.room) {
        get().incrementUnreadCount(message.room);
      }
    });

    socket.on('room_joined', ({ roomId, messages }) => {
      set({ messages });
    });

    socket.on('user_typing', ({ username }) => {
      set(state => ({
        typingUsers: [...state.typingUsers.filter(u => u !== username), username]
      }));
    });

    socket.on('user_stop_typing', ({ userId }) => {
      set(state => ({
        typingUsers: state.typingUsers.filter(u => u !== userId)
      }));
    });

    // New socket events for advanced features
    socket.on('reaction_added', ({ messageId, reactions }) => {
      get().updateMessageReactions(messageId, reactions);
    });

    socket.on('reaction_removed', ({ messageId, reactions }) => {
      get().updateMessageReactions(messageId, reactions);
    });

    socket.on('message_edited', (message: Message) => {
      get().updateMessage(message);
    });

    socket.on('message_deleted', ({ messageId }) => {
      get().removeMessage(messageId);
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  joinRoom: (roomId) => {
    const { socket, rooms } = get();
    const room = rooms.find(r => r._id === roomId);
    if (socket && room) {
      socket.emit('join_room', roomId);
      set({ currentRoom: room, messages: [] });
      // Mark room as read when joining
      get().markRoomAsRead(roomId);
    }
  },

  sendMessage: (content, fileData, replyTo) => {
    const { socket, currentRoom } = get();
    if (socket && currentRoom) {
      socket.emit('send_message', {
        roomId: currentRoom._id,
        content,
        messageType: fileData?.messageType || 'text',
        fileUrl: fileData?.fileUrl,
        fileName: fileData?.fileName,
        fileSize: fileData?.fileSize,
        thumbnailUrl: fileData?.thumbnailUrl,
        replyTo
      });
    }
  },

  addReaction: (messageId, emoji) => {
    const { socket } = get();
    if (socket) {
      socket.emit('add_reaction', { messageId, emoji });
    }
  },

  removeReaction: (messageId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('remove_reaction', { messageId });
    }
  },

  editMessage: (messageId, newContent) => {
    const { socket } = get();
    if (socket) {
      socket.emit('edit_message', { messageId, newContent });
    }
  },

  deleteMessage: (messageId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('delete_message', { messageId });
    }
  },

  searchMessages: async (roomId, query) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/chat/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ roomId, query })
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  },

  setRooms: (rooms) => set({ rooms }),

  addMessage: (message) => {
    set(state => ({
      messages: [...state.messages, message]
    }));
  },

  updateMessage: (updatedMessage) => {
    set(state => ({
      messages: state.messages.map(msg => 
        msg._id === updatedMessage._id ? updatedMessage : msg
      )
    }));
  },

  removeMessage: (messageId) => {
    set(state => ({
      messages: state.messages.filter(msg => msg._id !== messageId)
    }));
  },

  updateMessageReactions: (messageId, reactions) => {
    set(state => ({
      messages: state.messages.map(msg => 
        msg._id === messageId ? { ...msg, reactions } : msg
      )
    }));
  },

  markRoomAsRead: (roomId) => {
    set(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        [roomId]: 0
      }
    }));
  },

  incrementUnreadCount: (roomId) => {
    set(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        [roomId]: (state.unreadCounts[roomId] || 0) + 1
      }
    }));
  }
}));