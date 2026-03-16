'use client'

import { useState, useEffect, useRef } from 'react';
import { Users, Bell, MessageCircle, Heart, Sun, Moon, Ban, Lock, Download, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { API_URL, getDirectApiUrl } from '@/utils/api';
import NotificationSettings from '@/components/UI/NotificationSettings';
import ReactionsEditor from '@/components/Admin/ReactionsEditor';
import UserSearchModal from '@/components/UI/UserSearchModal';
import CreateRoomModal from './CreateRoomModal';
import DirectMessages from './DirectMessages';
import FavoritesList from './FavoritesList';
import BlockedList from './BlockedList';
import UserProfileCard from '@/components/User/UserProfileCard';
import { forwardRef, useImperativeHandle } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

type TabType = 'rooms' | 'direct' | 'favorites' | 'blocked';

interface SidebarProps {
  onOpenDirectMessage?: (userId: string, userInfo?: any) => void;
  selectedDirectUserId?: string | null;
  socket?: any;
}

const Sidebar = forwardRef<any, SidebarProps>(({ onOpenDirectMessage, selectedDirectUserId, socket }, ref) => {
  const { user, token } = useAuthStore();
  const { rooms, setRooms, joinRoom, currentRoom, isConnected, unreadCounts } = useChatStore();
  const { permission, isSubscribed, subscribe, unsubscribe, error: pushError, refreshSubscriptionStatus } = usePushNotifications(token);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('rooms');
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [, setNewConversationUser] = useState<any>(null);
  const [showReactionsEditor, setShowReactionsEditor] = useState(false);
  const [showUserSearchModal, setShowUserSearchModal] = useState(false);
  const directMessagesRef = useRef<any>(null);
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [roomPassword, setRoomPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) {
        return saved === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    // Применяем тему при загрузке
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }

    // Слушаем изменения системной темы только если пользователь не установил свою
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        setIsDarkMode(e.matches);
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    if (newMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await fetch(`${API_URL}/rooms`, {
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

  // toggleSound доступен через _toggleSound если понадобится

  const handleRoomClick = async (roomId: string) => {
    const room = rooms.find(r => r._id === roomId) as any;
    const isMember = room?.isMember !== false;

    if (room?.isPrivate && !isMember) {
      setPendingRoomId(roomId);
      setRoomPassword('');
      setPasswordError('');
      setShowPasswordModal(true);
      return;
    }

    const result = await joinRoom(roomId);
    if (result?.requiresPassword) {
      setPendingRoomId(roomId);
      setRoomPassword('');
      setPasswordError('');
      setShowPasswordModal(true);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!pendingRoomId) return;
    setPasswordError('');
    const result = await joinRoom(pendingRoomId, roomPassword);
    if (result?.error) {
      setPasswordError('Неверный пароль');
    } else {
      setShowPasswordModal(false);
      setPendingRoomId(null);
      setRoomPassword('');
      // Обновляем список комнат чтобы isMember обновился
      refreshRooms();
    }
  };

  const refreshRooms = async () => {
    try {
      const response = await fetch(`${API_URL}/rooms`, {
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

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    switchToDirectTab: () => {
      setActiveTab('direct');
      setTimeout(() => {
        if (directMessagesRef.current?.refreshConversations) {
          directMessagesRef.current.refreshConversations();
        }
      }, 100);
    },
    addConversation: (participant: any) => {
      setNewConversationUser(participant);
      if (directMessagesRef.current?.addConversation) {
        directMessagesRef.current.addConversation(participant);
      }
    },
    refreshConversations: () => {
      if (directMessagesRef.current?.refreshConversations) {
        directMessagesRef.current.refreshConversations();
      }
    },
    closeAllModals: () => {
      setShowNotificationSettings(false);
      setShowCreateRoom(false);
      setShowUserProfile(false);
      setShowPasswordModal(false);
      setShowInstallGuide(false);
    }
  }));

  const handleOpenDirectMessageLocal = async (userId: string, userInfo?: any) => {
    if (onOpenDirectMessage) {
      // Используем переданную функцию из родителя
      onOpenDirectMessage(userId, userInfo);
    } else {
      // Fallback на локальную реализацию
      try {
        console.log('Opening direct message with user:', userId);
        
        const response = await fetch(`${getDirectApiUrl()}/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'userid': user?.id || ''
          },
          body: JSON.stringify({ participantId: userId })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Conversation created/found:', data);
          
          setActiveTab('direct');
          setShowUserProfile(false);
        } else {
          const error = await response.json();
          alert(error.error || 'Ошибка создания чата');
        }
      } catch (error) {
        console.error('Error opening direct message:', error);
        alert('Ошибка сети');
      }
    }
  };

  return (
    <div className="w-80 h-full bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col animate-slide-up">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowUserProfile(true)}
          >
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
              onClick={(e) => { e.stopPropagation(); refreshSubscriptionStatus(); setShowNotificationSettings(true); }}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors button-press"
              title="Настройки уведомлений"
            >
              <Bell size={18} />
            </button>
            <button
              onClick={() => setShowInstallGuide(true)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors button-press"
              title="Установить приложение"
            >
              <Download size={18} />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors button-press"
              title={isDarkMode ? 'Светлая тема' : 'Тёмная тема'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto chat-scrollbar">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('rooms')}
            onContextMenu={(e) => { e.preventDefault(); if (user?.role === 'admin') setShowCreateRoom(true); }}
            onTouchStart={() => {
              if (user?.role !== 'admin') return;
              const t = setTimeout(() => setShowCreateRoom(true), 500);
              (window as any).__roomTabTimer = t;
            }}
            onTouchEnd={() => clearTimeout((window as any).__roomTabTimer)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === 'rooms'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <MessageCircle size={18} />
          </button>
          <button
            onClick={() => setActiveTab('direct')}
            onContextMenu={(e) => { e.preventDefault(); setShowUserSearchModal(true); }}
            onTouchStart={() => {
              const t = setTimeout(() => setShowUserSearchModal(true), 500);
              (window as any).__dmTabTimer = t;
            }}
            onTouchEnd={() => clearTimeout((window as any).__dmTabTimer)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === 'direct'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Users size={18} />
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'favorites'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            title="Избранное"
          >
            <Heart size={20} />
          </button>
          <button
            onClick={() => setActiveTab('blocked')}
            className={`flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'blocked'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            title="Заблокированные"
          >
            <Ban size={20} />
          </button>
        </div>

        {activeTab === 'rooms' ? (
          <div className="p-4">

            <div className="space-y-2">
              {rooms.map((room, index) => {
                const isMember = (room as any).isMember !== false;
                
                return (
                  <button
                    key={room._id}
                    onClick={() => handleRoomClick(room._id)}
                    className={`w-full text-left p-3 rounded-lg transition-all animate-fade-in hover:opacity-90 ${
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
                          <div className="flex items-center gap-1 min-w-0">
                            {(room as any).isPrivate && <Lock size={12} className="text-gray-400 flex-shrink-0" />}
                            <p className="font-medium truncate text-gray-900 dark:text-white">{room.name}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {room.members.length}
                            </span>
                            {isMember && unreadCounts[room._id] > 0 && (
                              <span className="bg-indigo-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                                {unreadCounts[room._id] > 99 ? '99+' : unreadCounts[room._id]}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {room.members.filter(m => m.isOnline).length > 0 && (
                            <span className="text-green-600 dark:text-green-400 text-xs">
                              {room.members.filter(m => m.isOnline).length} онлайн
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {rooms.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 animate-fade-in">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>Нет доступных комнат</p>
                {user?.role === 'admin' && (
                  <p className="text-sm mt-2">Создайте новую комнату</p>
                )}
              </div>
            )}
          </div>
        ) : activeTab === 'direct' ? (
          <DirectMessages 
            ref={directMessagesRef}
            onSelectConversation={handleOpenDirectMessageLocal}
            selectedUserId={selectedDirectUserId}
            socket={socket}
          />
        ) : activeTab === 'favorites' ? (
          <FavoritesList onOpenDirectMessage={handleOpenDirectMessageLocal} />
        ) : (
          <BlockedList />
        )}
      </div>



      {/* Modals */}
      {showNotificationSettings && (
        <NotificationSettings
          onClose={() => setShowNotificationSettings(false)}
          pushPermission={permission}
          pushSubscribed={isSubscribed}
          onPushSubscribe={subscribe}
          onPushUnsubscribe={unsubscribe}
          pushError={pushError}
        />
      )}

      {showReactionsEditor && (
        <ReactionsEditor onClose={() => setShowReactionsEditor(false)} />
      )}

      {showUserSearchModal && (
        <UserSearchModal
          onClose={() => setShowUserSearchModal(false)}
          onSelectUser={(u) => {
            handleOpenDirectMessageLocal(u._id, u);
            setShowUserSearchModal(false);
          }}
          currentUserId={user?.id}
          token={token}
        />
      )}

      {showCreateRoom && (
        <CreateRoomModal 
          onClose={() => setShowCreateRoom(false)}
          onRoomCreated={refreshRooms}
        />
      )}

      {showUserProfile && user && (
        <UserProfileCard
          user={{
            _id: user.id,
            username: user.username,
            displayName: user.displayName,
            role: user.role,
            isOnline: isConnected
          }}
          onClose={() => setShowUserProfile(false)}
          isOwnProfile={true}
          onOpenDirectMessage={handleOpenDirectMessageLocal}
        />
      )}

      {/* Password modal for private rooms */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-2 mb-4">
              <Lock size={20} className="text-indigo-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Приватная комната</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Введите пароль для входа</p>
            <input
              type="password"
              value={roomPassword}
              onChange={(e) => setRoomPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
              placeholder="Пароль"
              autoFocus
            />
            {passwordError && <p className="text-red-500 text-sm mb-3">{passwordError}</p>}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowPasswordModal(false); setPendingRoomId(null); }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Отмена
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Войти
              </button>
            </div>
          </div>
        </div>
      )}
      {showInstallGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowInstallGuide(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Download size={20} />
                Установить приложение
              </h2>
              <button onClick={() => setShowInstallGuide(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-5 text-sm text-gray-700 dark:text-gray-300">

              {/* Android */}
              <div>
                <p className="font-semibold text-base mb-2 flex items-center gap-2">🤖 Android (Chrome)</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400">
                  <li>Откройте сайт в Chrome</li>
                  <li>Нажмите три точки (⋮) в правом верхнем углу</li>
                  <li>Выберите «Добавить на главный экран»</li>
                  <li>Нажмите «Установить»</li>
                </ol>
              </div>

              {/* iOS */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="font-semibold text-base mb-2 flex items-center gap-2">🍎 iPhone / iPad (Safari)</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400">
                  <li>Откройте сайт в Safari</li>
                  <li>Нажмите кнопку «Поделиться» (квадрат со стрелкой вверх)</li>
                  <li>Прокрутите вниз и выберите «На экран "Домой"»</li>
                  <li>Нажмите «Добавить»</li>
                </ol>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">⚠️ Пуш-уведомления на iOS работают только в Safari 16.4+</p>
              </div>

              {/* Desktop */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="font-semibold text-base mb-2 flex items-center gap-2">💻 Компьютер (Chrome / Edge)</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400">
                  <li>Откройте сайт в Chrome или Edge</li>
                  <li>В адресной строке справа появится иконка установки (⊕)</li>
                  <li>Нажмите на неё и выберите «Установить»</li>
                  <li>Или: меню (⋮) → «Установить ChatReal»</li>
                </ol>
              </div>

            </div>
            <div className="flex justify-end p-5 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowInstallGuide(false)} className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
