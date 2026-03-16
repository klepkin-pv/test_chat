'use client'

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Search, X, Check, Reply, Menu } from 'lucide-react';
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
import MessageActions from '@/components/UI/MessageActions';
import MessageSearch from '@/components/UI/MessageSearch';
import RoomParticipants from '@/components/Chat/RoomParticipants';
import UserProfileCard from '@/components/User/UserProfileCard';
import ReactionsEditor from '@/components/Admin/ReactionsEditor';

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

interface ChatWindowProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenDirectMessage?: (userId: string) => void;
}

export default function ChatWindow({ sidebarOpen, onToggleSidebar, onOpenDirectMessage }: ChatWindowProps) {
  const { 
    currentRoom, 
    messages, 
    sendMessage, 
    typingUsers, 
    addReaction, 
    removeReaction, 
    editMessage, 
    deleteMessage
  } = useChatStore();
  const { user } = useAuthStore();
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const prevMessagesLengthRef = useRef(0);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showReactionsEditor, setShowReactionsEditor] = useState(false);

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
    if (messages.length > 0 && messages.length > prevMessagesLengthRef.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender._id !== user?.id) {
        // Воспроизводим звук только если окно не в фокусе
        if (!isWindowFocused) {
          soundManager.playMessageSound();
        }
        
        // Show notification if window is not focused
        if (currentRoom) {
          showRoomMessageNotification(lastMessage, currentRoom.name);
        }
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, user?.id, currentRoom, showRoomMessageNotification, isWindowFocused]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() && currentRoom) {
      sendMessage(messageText.trim(), undefined, replyingTo ?? undefined);
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
    
    // Убрали звук при наборе текста
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
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
  const isAdmin = currentRoom?.admins?.some(admin => admin._id === user?.id) || 
                  currentRoom?.owner?._id === user?.id;

  if (!currentRoom) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header с кнопкой меню даже без чата */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button
            onClick={onToggleSidebar}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors button-press"
            title="Открыть меню"
          >
            <Menu size={20} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center animate-fade-in">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Выберите комнату</h3>
            <p className="text-gray-500 dark:text-gray-400">Выберите комнату из списка слева, чтобы начать общение</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Header - Sticky top */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 animate-slide-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={onToggleSidebar}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors button-press"
              title={sidebarOpen ? 'Скрыть меню' : 'Показать меню'}
            >
              <Menu size={20} />
            </button>
            <button 
              onClick={() => setShowParticipants(true)}
              className="flex-1 text-left hover:opacity-80 transition-opacity"
            >
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
            </button>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center space-x-2">
            {/* Reactions editor for admin */}
            {user?.role === 'admin' && (
              <button
                onClick={() => setShowReactionsEditor(true)}
                className="p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors button-press"
                title="Настроить реакции"
              >
                😊
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
      {showSearch && currentRoom && (
        <MessageSearch
          roomId={currentRoom._id}
          onClose={() => setShowSearch(false)}
          onMessageSelect={handleSearchResultClick}
        />
      )}

      {/* Messages */}
      <div className="absolute inset-0 overflow-y-auto p-4 space-y-4 chat-scrollbar" style={{ top: '73px', bottom: '73px' }}>
        {messages.map((message, index) => (
          <div
            key={message._id}
            id={`message-${message._id}`}
            className={`flex message-appear group ${
              message.sender._id === user?.id ? 'justify-end' : 'justify-start'
            } ${highlightedMessageId === message._id ? 'bg-yellow-100 dark:bg-yellow-900/20 rounded-lg p-2 -m-2' : ''}`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex flex-col max-w-xs lg:max-w-md relative group">
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

              <MessageActions
                messageId={message._id}
                isOwnMessage={message.sender._id === user?.id}
                onReaction={handleAddReaction}
                roomId={currentRoom._id}
                contextMenu={
                  <MessageContextMenu
                    messageId={message._id}
                    content={message.content}
                    isOwnMessage={message.sender._id === user?.id}
                    isTextMessage={message.messageType === 'text'}
                    senderId={message.sender._id}
                    senderName={message.sender.username}
                    alignRight={message.sender._id === user?.id}
                    onReply={handleReplyToMessage}
                    onEdit={handleEditMessage}
                    onDelete={handleDeleteMessage}
                    onOpenProfile={(userId) => {
                      const sender = currentRoom?.members.find(m => m._id === userId);
                      if (sender) {
                        setSelectedUser(sender);
                        setShowUserProfile(true);
                      }
                    }}
                  />
                }
              >
                <div
                  className={`transition-all hover-lift ${
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
                        <button onClick={handleSaveEdit} className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"><Check size={12} /></button>
                        <button onClick={handleCancelEdit} className="text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"><X size={12} /></button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {(message.messageType === 'file' || message.messageType === 'image') && message.fileUrl ? (
                        <div className={message.sender._id === user?.id ? 'p-2' : 'p-0'}>
                          <FileMessage fileUrl={message.fileUrl} fileName={message.fileName || 'Файл'} fileSize={message.fileSize || 0} thumbnailUrl={message.thumbnailUrl} isImage={message.messageType === 'image'} />
                          {message.content && message.content !== `📷 ${message.fileName}` && message.content !== `📎 ${message.fileName}` && (
                            <p className="text-sm mt-2 px-2 pb-2">{message.content}</p>
                          )}
                        </div>
                      ) : (
                        <div className="px-4 py-2">
                          <p className="text-sm whitespace-pre-wrap">
                            {message.content}
                            {message.isEdited && (
                              <span className="inline-flex items-center ml-1 opacity-60" title="Изменено">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </span>
                            )}
                            <span className={`inline-flex items-center ml-2 align-bottom text-[10px] leading-none ${message.sender._id === user?.id ? 'text-indigo-100' : 'text-gray-400 dark:text-gray-500'}`}>
                              {formatTime(message.createdAt)}
                            </span>
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </MessageActions>

              {editingMessageId !== message._id && (
                <MessageReactions
                  messageId={message._id}
                  reactions={message.reactions || []}
                  currentUserId={user?.id || ''}
                  onAddReaction={handleAddReaction}
                  onRemoveReaction={handleRemoveReaction}
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

      {/* Message Input - Fixed bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
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
      {/* Room Participants Modal */}
      {showParticipants && currentRoom && (
        <RoomParticipants
          roomId={currentRoom._id}
          roomName={currentRoom.name}
          roomDescription={currentRoom.description}
          roomIsPrivate={(currentRoom as any).isPrivate}
          roomAvatar={(currentRoom as any).avatar}
          members={currentRoom.members as any}
          isAdmin={isAdmin}
          currentUserId={user?.id}
          ownerId={(currentRoom as any).owner?._id || (currentRoom as any).owner}
          onClose={() => setShowParticipants(false)}
          onRoomUpdated={() => window.location.reload()}
          onLeaveRoom={() => window.location.reload()}
          onOpenDirectMessage={onOpenDirectMessage}
        />
      )}

      {/* User Profile Card */}
      {showUserProfile && selectedUser && (
        <UserProfileCard
          user={selectedUser}
          onClose={() => {
            setShowUserProfile(false);
            setSelectedUser(null);
          }}
          roomId={currentRoom?._id}
          onOpenDirectMessage={onOpenDirectMessage}
        />
      )}

      {/* Reactions Editor */}
      {showReactionsEditor && currentRoom && (
        <ReactionsEditor
          onClose={() => setShowReactionsEditor(false)}
          roomId={currentRoom._id}
          roomName={currentRoom.name}
        />
      )}
    </div>
  );
}