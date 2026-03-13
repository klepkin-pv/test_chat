'use client'

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { usePageTitle } from '@/hooks/usePageTitle';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';

export default function Chat() {
  const { user, token } = useAuthStore();
  const { connect, isConnected, unreadCounts } = useChatStore();

  // Calculate total unread count
  const totalUnreadCount = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  
  // Update page title with unread count
  usePageTitle(totalUnreadCount);

  useEffect(() => {
    if (user && token && !isConnected) {
      connect(token, user.id, user.username);
    }
  }, [user, token, isConnected, connect]);

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      <Sidebar />
      <ChatWindow />
    </div>
  );
}