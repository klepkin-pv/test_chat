'use client'

import { useState, useEffect } from 'react';
import { MessageCircle, Search, Plus, X, Block } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface User {
  _id: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
}

interface Conversation {
  user: User;
  lastMessage: {
    _id: string;
    content: string;
    sender: string;
    createdAt: string;
    messageType: string;
  };
  unreadCount: number;
}

interface DirectMessagesProps {
  onSelectConversation: (userId: string) => void;
  selectedUserId?: string;
}

export default function DirectMessages({ onSelectConversation, selectedUserId }: DirectMessagesProps) {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/direct/conversations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'userid': user?.id || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/direct/users/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'userid': user?.id || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  const handleStartConversation = (selectedUser: User) => {
    onSelectConversation(selectedUser._id);
    setShowUserSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const formatLastMessage = (message: Conversation['lastMessage']) => {
    if (message.messageType === 'image') return '📷 Изображение';
    if (message.messageType === 'file') return '📎 Файл';
    return message.content;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('ru-RU', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }
  };

  return (
    <div className="w-80 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
            <MessageCircle size={20} className="mr-2" />
            Сообщения
          </h3>
          <button
            onClick={() => setShowUserSearch(true)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors button-press"
            title="Новое сообщение"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto chat-scrollbar">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
            <p>Нет сообщений</p>
            <p className="text-sm">Начните новый разговор</p>
          </div>
        ) : (
          <div className="p-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.user._id}
                onClick={() => onSelectConversation(conversation.user._id)}
                className={`w-full p-3 rounded-lg transition-all hover:bg-gray-200 dark:hover:bg-gray-700 text-left ${
                  selectedUserId === conversation.user._id
                    ? 'bg-indigo-100 dark:bg-indigo-900'
                    : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {conversation.user.username[0].toUpperCase()}
                    </div>
                    {conversation.user.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {conversation.user.username}
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(conversation.lastMessage.createdAt)}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <span className="bg-indigo-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {conversation.lastMessage.sender === user?.id ? 'Вы: ' : ''}
                      {formatLastMessage(conversation.lastMessage)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* User Search Modal */}
      {showUserSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Новое сообщение
                </h3>
                <button
                  onClick={() => {
                    setShowUserSearch(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-4">
              <div className="relative mb-4">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Поиск пользователей..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  autoFocus
                />
              </div>

              <div className="max-h-60 overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    Поиск...
                  </div>
                ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    Пользователи не найдены
                  </div>
                ) : (
                  searchResults.map((searchUser) => (
                    <button
                      key={searchUser._id}
                      onClick={() => handleStartConversation(searchUser)}
                      className="w-full p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {searchUser.username[0].toUpperCase()}
                          </div>
                          {searchUser.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {searchUser.username}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {searchUser.isOnline ? 'В сети' : 'Не в сети'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}