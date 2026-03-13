'use client'

import { useState, useEffect } from 'react';
import { LogOut, Plus, Users, Settings, Volume2, VolumeX, Bell, MessageCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { soundManager } from '@/utils/sounds';
import NotificationSettings from '@/components/UI/NotificationSettings';
import CreateRoomModal from './CreateRoomModal';
import DirectMessages from './DirectMessages';

type TabType = 'rooms' | 'direct';

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { rooms, setRooms, joinRoom, currentRoom, isConnected, unreadCounts } = useChatStore();
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('rooms');

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { rooms, setRooms, joinRoom, currentRoom, isConnected, unreadCounts } = useChatStore();
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  useEffect(() => {
    // Загружаем комнаты пользователя
    const fetchRooms = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/rooms`, {
          headers: {
            'userid': user?.id || ''
          }
        });
        const data = await response.json();
        setRooms(data.rooms || []);
      } catch (error) {
        console.error('Failed to fetch rooms:', error);
      }
    };

    if (user) {
      fetchRooms();
    }
  }, [user, setRooms]);

  const handleLogout = () => {
    logout();
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    soundManager.setEnabled(newState);
    
    if (newState) {
      soundManager.playNotificationSound();
    }
  };

  const handleRoomClick = (roomId: string) => {
    joinRoom(roomId);
    soundManager.playJoinSound();
  };

  const refreshRooms = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/rooms`, {
        headers: {
          'userid': user?.id || ''
        }
      });
      const data = await response.json();
      setRooms(data.rooms || []);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  return (
    <div className="w-80 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col animate-slide-up">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold transition-all hover-lift">
                {user?.username?.[0]?.toUpperCase()}
              </div>
              {isConnected && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 pulse-ring"></div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {user?.username}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isConnected ? 'В сети' : 'Не в сети'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowNotificationSettings(true)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors button-press"
              title="Настройки уведомлений"
            >
              <Bell size={18} />
            </button>
            <button
              onClick={toggleSound}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors button-press"
              title={soundEnabled ? 'Отключить звуки' : 'Включить звуки'}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors button-press"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Rooms */}
      <div className="flex-1 overflow-y-auto chat-scrollbar">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === 'rooms'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Users size={18} />
            Комнаты
          </button>
          <button
            onClick={() => setActiveTab('direct')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === 'direct'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <MessageCircle size={18} />
            Личные
          </button>
        </div>

        {activeTab === 'rooms' ? (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900 dark:text-white">Комнаты</h4>
              <button
                onClick={() => setShowCreateRoom(true)}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors button-press hover-lift"
                title={user?.role === 'admin' ? 'Создать комнату' : 'Только админы могут создавать комнаты'}
              >
                <Plus size={16} />
              </button>
            </div>

          <div className="space-y-2">
            {rooms.map((room, index) => {
              const isMember = (room as any).isMember !== false;
              
              return (
                <div
                  key={room._id}
                  className={`w-full text-left p-3 rounded-lg transition-all animate-fade-in ${
                    currentRoom?._id === room._id
                      ? 'bg-indigo-100 dark:bg-indigo-900'
                      : 'bg-white dark:bg-gray-700'
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                        <Users size={16} />
                      </div>
                      {room.members.filter(m => m.isOnline).length > 0 && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white dark:border-gray-800"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate text-gray-900 dark:text-white">{room.name}</p>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {room.members.length} участников
                          </span>
                          {isMember && unreadCounts[room._id] > 0 && (
                            <span className="bg-indigo-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                              {unreadCounts[room._id] > 99 ? '99+' : unreadCounts[room._id]}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                          {room.members.filter(m => m.isOnline).length > 0 && (
                            <span className="text-green-600 dark:text-green-400">
                              {room.members.filter(m => m.isOnline).length} онлайн
                            </span>
                          )}
                        </div>
                        {isMember ? (
                          <button
                            onClick={() => handleRoomClick(room._id)}
                            className="text-xs px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
                          >
                            Открыть
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRoomClick(room._id)}
                            className="text-xs px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded"
                          >
                            Присоединиться
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {rooms.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 animate-fade-in">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p>Нет доступных комнат</p>
              {user?.role === 'admin' && (
                <p className="text-sm">Создайте новую комнату</p>
              )}
            </div>
          )}
        </div>
        ) : (
          <DirectMessages />
        )}
      </div>

      {/* Settings */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button className="flex items-center space-x-3 w-full p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all button-press">
          <Settings size={20} />
          <span>Настройки</span>
        </button>
      </div>

      {/* Notification Settings Modal */}
      {showNotificationSettings && (
        <NotificationSettings onClose={() => setShowNotificationSettings(false)} />
      )}

      {/* Create Room Modal */}
      {showCreateRoom && (
        <CreateRoomModal 
          onClose={() => setShowCreateRoom(false)}
          onRoomCreated={refreshRooms}
        />
      )}
    </div>
  );
}