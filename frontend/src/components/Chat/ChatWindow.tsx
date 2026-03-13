'use client'

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Search, X, Check, Edit2, Reply, Settings } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { soundManager } from '@/utils/sounds';
import { useNotifications } from '@/hooks/useNotifications';
import { useWindowFocus } from '@/hooks/useWindowFocus';
import EmojiPicker from '@/components/UI/EmojiPicker';
import FileUpload from '@/components/UI/FileUpload';
import FileMessage from '@/components/UI/FileMessage';
import MessageReactions from '@/components/UI/MessageReactions';
import MessageContextMenu from '@/components/UI/MessageContextMenu';
import MessageSearch from '@/components/UI/MessageSearch';
import RoomManagement from '@/components/Chat/RoomManagement';

interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  size: number;
  mimeType: string;
  isImage: boolean;
  url: string;
  thumbnailUrl?: string;
}

export default function ChatWindow() {
  const { 
    currentRoom, 
    messages, 
    sendMessage, 
    typingUsers, 
    addReaction, 
    removeReaction, 
    editMessage, 
    deleteMessage,
    searchMessages 
  } = useChatStore();
  const { user } = useAuthStore();
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showRoomManagement, setShowRoomManagement] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const isWindowFocused = useWindowFocus();
  const { showRoomMessageNotification } = useNotifications({
    isWindowFocused,
    currentUserId: user?.id,
    currentRoomId: currentRoom?._id
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Воспроизводим звук при новых сообщениях и показываем уведомления
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender._id !== user?.id) {
        soundManager.playMessageSound();
        
        // Show notification if window is not focused
        if (currentRoom) {
          showRoomMessageNotification(lastMessage, currentRoom.name);
        }
      }
    }
  }, [messages, user?.id, currentRoom, showRoomMessageNotification]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() && currentRoom) {
      sendMessage(messageText.trim(), undefined, replyingTo);
      setMessageText('');
      setIsTyping(false);
      setReplyingTo(null);
    }
  };

  const handleEditMessage = (messageId: string) => {
    const message = messages.find(m => m._id === messageId);
    if (message && message.messageType === 'text') {
      setEditingMessageId(messageId);
      setEditingText(message.content);
    }
  };

  const handleSaveEdit = () => {
    if (editingMessageId && editingText.trim()) {
      editMessage(editingMessageId, editingText.trim());
      setEditingMessageId(null);
      setEditingText('');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleReplyToMessage = (messageId: string) => {
    setReplyingTo(messageId);
  };

  const handleDeleteMessage = (messageId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить это сообщение?')) {
      deleteMessage(messageId);
    }
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    addReaction(messageId, emoji);
  };

  const handleRemoveReaction = (messageId: string) => {
    removeReaction(messageId);
  };

  const handleSearch = async (query: string) => {
    if (!currentRoom || !query.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      const results = await searchMessages(currentRoom._id, query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    }
  };

  const handleSearchResultClick = (messageId: string) => {
    setHighlightedMessageId(messageId);
    setShowSearch(false);
    
    // Scroll to message
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Remove highlight after 3 seconds
    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 3000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    
    // Эмуляция индикатора набора текста
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
      soundManager.playTypingSound();
    } else if (isTyping && e.target.value.length === 0) {
      setIsTyping(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
  };

  const handleFilesUploaded = (files: UploadedFile[]) => {
    if (!currentRoom) return;

    // Отправляем каждый файл как отдельное сообщение
    files.forEach(file => {
      const messageContent = file.isImage ? `📷 ${file.originalName}` : `📎 ${file.originalName}`;
      
      sendMessage(messageContent, {
        messageType: file.isImage ? 'image' : 'file',
        fileUrl: file.url,
        fileName: file.originalName,
        fileSize: file.size,
        thumbnailUrl: file.thumbnailUrl
      });
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReplyMessage = (replyToId: string) => {
    return messages.find(m => m._id === replyToId);
  };

  // Check if current user is admin or owner
  const isAdmin = currentRoom?.admins.some(admin => admin._id === user?.id) || 
                  currentRoom?.owner._id === user?.id;

  if (!currentRoom) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Выберите комнату
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Выберите комнату из списка слева, чтобы начать общение
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 animate-slide-up">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentRoom.name}
            </h2>
            <div className="flex items-center space-x-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {currentRoom.members.length} участников
              </p>
              {currentRoom.members.filter(m => m.isOnline).length > 0 && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full pulse-ring"></div>
                  <span className="text-xs text-green-600 dark:text-green-400">
                    {currentRoom.members.filter(m => m.isOnline).length} онлайн
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            {/* Room management button (only for admins) */}
            {isAdmin && (
              <button
                onClick={() => setShowRoomManagement(true)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors button-press"
                title="Управление комнатой"
              >
                <Settings size={20} />
              </button>
            )}
            
            {/* Search button */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors button-press"
              title="Поиск сообщений"
            >
              <Search size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Search Panel */}
      {showSearch && (
        <MessageSearch
          onSearch={handleSearch}
          searchResults={searchResults}
          onResultClick={handleSearchResultClick}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900 chat-scrollbar">
        {messages.map((message, index) => (
          <div
            key={message._id}
            id={`message-${message._id}`}
            className={`flex message-appear group ${
              message.sender._id === user?.id ? 'justify-end' : 'justify-start'
            } ${highlightedMessageId === message._id ? 'bg-yellow-100 dark:bg-yellow-900/20 rounded-lg p-2 -m-2' : ''}`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex flex-col max-w-xs lg:max-w-md">
              {/* Reply indicator */}
              {message.replyTo && (
                <div className="mb-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400 border-l-2 border-indigo-500">
                  <div className="flex items-center space-x-1">
                    <Reply size={12} />
                    <span>Ответ на:</span>
                  </div>
                  {(() => {
                    const replyMessage = getReplyMessage(message.replyTo);
                    return replyMessage ? (
                      <p className="truncate mt-1">
                        <span className="font-medium">{replyMessage.sender.username}:</span> {replyMessage.content}
                      </p>
                    ) : (
                      <p className="italic">Сообщение удалено</p>
                    );
                  })()}
                </div>
              )}

              <div
                className={`relative transition-all hover-lift ${
                  message.sender._id === user?.id
                    ? 'bg-indigo-500 text-white rounded-lg'
                    : 'text-gray-900 dark:text-white'
                }`}
              >
                {message.sender._id !== user?.id && (
                  <p className="text-xs font-semibold mb-1 text-indigo-600 dark:text-indigo-400 px-4 pt-2">
                    {message.sender.username}
                  </p>
                )}
                
                {/* Editing mode */}
                {editingMessageId === message._id ? (
                  <div className="p-4">
                    <input
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      autoFocus
                    />
                    <div className="flex space-x-2 mt-2">
                      <button
                        onClick={handleSaveEdit}
                        className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* File Message */}
                    {(message.messageType === 'file' || message.messageType === 'image') && message.fileUrl ? (
                      <div className={message.sender._id === user?.id ? 'p-2' : 'p-0'}>
                        <FileMessage
                          fileUrl={message.fileUrl}
                          fileName={message.fileName || 'Файл'}
                          fileSize={message.fileSize || 0}
                          thumbnailUrl={message.thumbnailUrl}
                          isImage={message.messageType === 'image'}
                        />
                        {message.content && message.content !== `📷 ${message.fileName}` && message.content !== `📎 ${message.fileName}` && (
                          <p className="text-sm mt-2 px-2 pb-2">{message.content}</p>
                        )}
                      </div>
                    ) : (
                      /* Text Message */
                      <div className="px-4 py-2">
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                          {message.isEdited && (
                            <span className="text-xs opacity-70 ml-2">(изменено)</span>
                          )}
                        </p>
                      </div>
                    )}
                  </>
                )}
                
                {/* Message actions */}
                <div className="absolute top-2 right-2">
                  <MessageContextMenu
                    messageId={message._id}
                    content={message.content}
                    isOwnMessage={message.sender._id === user?.id}
                    isTextMessage={message.messageType === 'text'}
                    onReply={handleReplyToMessage}
                    onEdit={handleEditMessage}
                    onDelete={handleDeleteMessage}
                  />
                </div>
                
                <div className="flex items-center justify-between px-4 pb-2">
                  <p
                    className={`text-xs ${
                      message.sender._id === user?.id
                        ? 'text-indigo-100'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>

              {/* Message reactions */}
              {editingMessageId !== message._id && (
                <MessageReactions
                  messageId={message._id}
                  reactions={message.reactions || []}
                  currentUserId={user?.id || ''}
                  onAddReaction={handleAddReaction}
                  onRemoveReaction={handleRemoveReaction}
                  className="mt-1"
                />
              )}
            </div>
          </div>
        ))}

        {/* Typing indicators */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <span className="typing-dots">{typingUsers.join(', ')} печатает</span>
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {/* Reply indicator */}
        {replyingTo && (
          <div className="mb-3 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg border-l-4 border-indigo-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Reply size={14} className="text-indigo-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Ответ на сообщение:</span>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={16} />
              </button>
            </div>
            {(() => {
              const replyMessage = getReplyMessage(replyingTo);
              return replyMessage ? (
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 truncate">
                  <span className="font-medium">{replyMessage.sender.username}:</span> {replyMessage.content}
                </p>
              ) : (
                <p className="text-sm text-gray-500 italic">Сообщение не найдено</p>
              );
            })()}
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowFileUpload(true)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors button-press"
            title="Прикрепить файл"
          >
            <Paperclip size={20} />
          </button>
          
          <div className="flex-1 relative">
            <input
              type="text"
              value={messageText}
              onChange={handleInputChange}
              placeholder="Введите сообщение..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
            />
          </div>

          <EmojiPicker onEmojiSelect={handleEmojiSelect} />

          <button
            type="submit"
            disabled={!messageText.trim()}
            className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all button-press hover-lift"
          >
            <Send size={20} />
          </button>
        </form>
      </div>

      {/* File Upload Modal */}
      {showFileUpload && (
        <FileUpload
          onFilesUploaded={handleFilesUploaded}
          onClose={() => setShowFileUpload(false)}
        />
      )}
      {/* Room Management Modal */}
      {showRoomManagement && (
        <RoomManagement onClose={() => setShowRoomManagement(false)} />
      )}
    </div>
  );
}