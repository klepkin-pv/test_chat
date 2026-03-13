'use client'

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import DirectMessages from './DirectMessages';
import DirectMessageWindow from './DirectMessageWindow';
import { useChatStore } from '@/store/chatStore';

export default function DirectMessagesPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { socket } = useChatStore();

  const handleSelectConversation = (userId: string) => {
    setSelectedUserId(userId);
  };

  return (
    <div className="flex h-full">
      <DirectMessages 
        onSelectConversation={handleSelectConversation}
        selectedUserId={selectedUserId || undefined}
      />
      
      {selectedUserId ? (
        <DirectMessageWindow 
          recipientId={selectedUserId}
          socket={socket}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center animate-fade-in">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Выберите чат
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Выберите существующий чат или начните новый разговор
            </p>
          </div>
        </div>
      )}
    </div>
  );
}