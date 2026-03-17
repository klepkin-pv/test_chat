'use client'

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { getDirectApiUrl } from '@/utils/api';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import DirectMessageWindow from './DirectMessageWindow';

export default function Chat() {
  const { user, token } = useAuthStore();
  const { connect, isConnected, unreadCounts, currentRoom, socket } = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedDirectUserId, setSelectedDirectUserId] = useState<string | null>(null);
  const [selectedDirectUser, setSelectedDirectUser] = useState<any>(null);
  const sidebarRef = useRef<any>(null);

  // Проверяем токен при старте и периодически
  useAuthGuard();

  // Calculate total unread count
  const totalUnreadCount = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  
  // Update page title with unread count
  usePageTitle(totalUnreadCount);

  useEffect(() => {
    if (user && token && !isConnected) {
      connect(token, user.id, user.username);
    }
  }, [user, token, isConnected, connect]);

  const closeSidebar = () => {
    sidebarRef.current?.closeAllModals();
    setSidebarOpen(false);
  };

  // ESC: закрывает модалки или открывает сайдбар
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (sidebarOpen) { closeSidebar(); } else { setSidebarOpen(true); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  useEffect(() => {
    if (currentRoom) {
      closeSidebar();
      setSelectedDirectUserId(null);
    }
  }, [currentRoom]);

  const handleOpenDirectMessage = async (userId: string, userInfo?: any) => {
    try {
      
      // Устанавливаем выбранного пользователя сразу
      setSelectedDirectUserId(userId);
      
      // Если userInfo передан, используем его сразу
      if (userInfo) {
        setSelectedDirectUser(userInfo);
      }
      
      // Закрываем sidebar
      closeSidebar();
      
      // Переключаем на вкладку "Личка" через ref
      if (sidebarRef.current?.switchToDirectTab) {
        sidebarRef.current.switchToDirectTab();
      }
      
      // Создаем/получаем conversation
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
        
        // Сохраняем информацию о пользователе
        setSelectedDirectUser(data.participant);
        
        // Добавляем пользователя в список через ref
        if (sidebarRef.current?.addConversation) {
          sidebarRef.current.addConversation(data.participant);
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Ошибка создания чата');
        // Сбрасываем выбор при ошибке
        setSelectedDirectUserId(null);
        setSelectedDirectUser(null);
      }
    } catch (error) {
      console.error('Error opening direct message:', error);
      alert('Ошибка сети');
      // Сбрасываем выбор при ошибке
      setSelectedDirectUserId(null);
      setSelectedDirectUser(null);
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 overflow-hidden relative">
      {/* Overlay — закрывает сайдбар по клику вне */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={closeSidebar}
        />
      )}
      
      {/* Sidebar — всегда fixed, поверх чата */}
      <div 
        className={`fixed top-0 left-0 z-20 h-full transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar 
          ref={sidebarRef}
          onOpenDirectMessage={handleOpenDirectMessage}
          selectedDirectUserId={selectedDirectUserId}
          socket={socket}
        />
      </div>
      
      {/* Chat Window — всегда на весь экран */}
      <div className="w-full h-full overflow-hidden">
        {selectedDirectUserId ? (
          <DirectMessageWindow 
            recipientId={selectedDirectUserId}
            recipientInfo={selectedDirectUser}
            socket={socket}
            onClose={() => {
              setSelectedDirectUserId(null);
              setSelectedDirectUser(null);
            }}
            onToggleSidebar={() => { if (sidebarOpen) closeSidebar(); else setSidebarOpen(true); }}
            onOpenDirectMessage={handleOpenDirectMessage}
            onMessageSent={() => {
              // Обновляем список диалогов после отправки сообщения
              if (sidebarRef.current?.refreshConversations) {
                sidebarRef.current.refreshConversations();
              }
            }}
          />
        ) : (
          <ChatWindow 
            sidebarOpen={sidebarOpen} 
            onToggleSidebar={() => { if (sidebarOpen) closeSidebar(); else setSidebarOpen(true); }}
            onOpenDirectMessage={handleOpenDirectMessage}
          />
        )}
      </div>
    </div>
  );
}
