'use client'

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, MoreVertical, Block, X, Check, Edit2, Reply } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { soundManager } from '@/utils/sounds';
import { useNotifications } from '@/hooks/useNotifications';
import { useWindowFocus } from '@/hooks/useWindowFocus';
import EmojiPicker from '@/components/UI/EmojiPicker';
import FileUpload from '@/components/UI/FileUpload';
import FileMessage from '@/components/UI/FileMessage';
import MessageReactions from '@/components/UI/MessageReactions';
import MessageContextMenu from '@/components/UI/MessageContextMenu';

interface DirectMessage {
  _id: string;
  content: string;
  sender: {
    _id: string;
    username: string;
    avatar?: string;
  };
  recipient: {
    _id: string;
    username: string;
    avatar?: string;
  };
  messageType: 'text' | 'file' | 'image';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  thumbnailUrl?: string;
  isRead: boolean;
  readAt?: string;
  isEdited?: boolean;
  editedAt?: string;
  replyTo?: string;
  reactions: Array<{
    user: string;
    emoji: string;
  }>;
  createdAt: string;
}

interface User {
  _id: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
}

interface DirectMessageWindowProps {
  recipientId: string;
  socket: any;
}

export default function DirectMessageWindow({ recipientId, socket }: DirectMessageWindowProps) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [recipient, setRecipient] = useState<User | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isWindowFocused = useWindowFocus();
  const { showDirectMessageNotification } = useNotifications({
    isWindowFocused,
    currentUserId: user?.id
  });

  useEffect(() => {
    if (recipientId) {
      loadMessages();
      markMessagesAsRead();
    }
  }, [recipientId]);

  useEffect(() => {
    if (!socket) return;

    const handleNewDirectMessage = (message: DirectMessage) => {
      if (
        (message.sender._id === recipientId && message.recipient._id === user?.id) ||
        (message.sender._id === user?.id && message.recipient._id === recipientId)
      ) {
        setMessages(prev => [...prev, message]);
        if (message.sender._id !== user?.id) {
          soundManager.playMessageSound();
          showDirectMessageNotification(message);
          markMessagesAsRead();
        }
      }
    };

    const handleDirectMessageEdited = (message: DirectMessage) => {
      setMessages(prev => prev.map(msg => 
        msg._id === message._id ? message : msg
      ));
    };

    const handleDirectMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
    };

    const handleDirectReactionAdded = ({ messageId, reactions }: { messageId: string; reactions: any[] }) => {
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? { ...msg, reactions } : msg
      ));
    };

    const handleDirectReactionRemoved = ({ messageId, reactions }: { messageId: string; reactions: any[] }) => {
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? { ...msg, reactions } : msg
      ));
    };

    socket.on('new_direct_message', handleNewDirectMessage);
    socket.on('direct_message_edited', handleDirectMessageEdited);
    socket.on('direct_message_deleted', handleDirectMessageDeleted);
    socket.on('direct_reaction_added', handleDirectReactionAdded);
    socket.on('direct_reaction_removed', handleDirectReactionRemoved);

    return () => {
      socket.off('new_direct_message', handleNewDirectMessage);
      socket.off('direct_message_edited', handleDirectMessageEdited);
      socket.off('direct_message_deleted', handleDirectMessageDeleted);
      socket.off('direct_reaction_added', handleDirectReactionAdded);
      socket.off('direct_reaction_removed', handleDirectReactionRemoved);
    };
  }, [socket, recipientId, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/direct/messages/${recipientId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'userid': user?.id || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        
        // Get recipient info from first message
        if (data.messages.length > 0) {
          const firstMessage = data.messages[0];
          const recipientInfo = firstMessage.sender._id === user?.id 
            ? firstMessage.recipient 
            : firstMessage.sender;
          setRecipient(recipientInfo);
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const markMessagesAsRead = () => {
    if (socket && recipientId) {
      socket.emit('mark_direct_messages_read', { senderId: recipientId });
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() && socket) {
      socket.emit('send_direct_message', {
        recipientId,
        content: messageText.trim(),
        messageType: 'text',
        replyTo: replyingTo
      });
      setMessageText('');
      setReplyingTo(null);
    }
  };

  const handleFilesUploaded = (files: any[]) => {
    files.forEach(file => {
      const messageContent = file.isImage ? `📷 ${file.originalName}` : `📎 ${file.originalName}`;
      
      if (socket) {
        socket.emit('send_direct_message', {
          recipientId,
          content: messageContent,
          messageType: file.isImage ? 'image' : 'file',
          fileUrl: file.url,
          fileName: file.originalName,
          fileSize: file.size,
          thumbnailUrl: file.thumbnailUrl
        });
      }
    });
  };

  const handleEditMessage = (messageId: string) => {
    const message = messages.find(m => m._id === messageId);
    if (message && message.messageType === 'text') {
      setEditingMessageId(messageId);
      setEditingText(message.content);
    }
  };

  const handleSaveEdit = () => {
    if (editingMessageId && editingText.trim() && socket) {
      socket.emit('edit_direct_message', {
        messageId: editingMessageId,
        newContent: editingText.trim()
      });
      setEditingMessageId(null);
      setEditingText('');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleDeleteMessage = (messageId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить это сообщение?') && socket) {
      socket.emit('delete_direct_message', { messageId });
    }
  };

  const handleReplyToMessage = (messageId: string) => {
    setReplyingTo(messageId);
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    if (socket) {
      socket.emit('add_direct_reaction', { messageId, emoji });
    }
  };

  const handleRemoveReaction = (messageId: string) => {
    if (socket) {
      socket.emit('remove_direct_reaction', { messageId });
    }
  };

  const handleBlockUser = async () => {
    if (!window.confirm(`Вы уверены, что хотите заблокировать ${recipient?.username}?`)) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/direct/block/${recipientId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'userid': user?.id || ''
        }
      });

      if (response.ok) {
        setShowUserMenu(false);
        // Optionally redirect or show blocked state
      }
    } catch (error) {
      console.error('Failed to block user:', error);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
  };

  const getReplyMessage = (replyToId: string) => {
    return messages.find(m => m._id === replyToId);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!recipient) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Загрузка...
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                {recipient.username[0].toUpperCase()}
              </div>
              {recipient.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {recipient.username}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {recipient.isOnline ? 'В сети' : 'Не в сети'}
              </p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <MoreVertical size={20} />
            </button>

            {showUserMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-20 min-w-[120px]">
                  <button
                    onClick={handleBlockUser}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                  >
                    <Block size={14} />
                    <span>Заблокировать</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900 chat-scrollbar">
        {messages.map((message, index) => (
          <div
            key={message._id}
            className={`flex message-appear group ${
              message.sender._id === user?.id ? 'justify-end' : 'justify-start'
            }`}
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
                    : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm'
                }`}
              >
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
                      <div className={message.sender._id === user?.id ? 'p-2' : 'p-2'}>
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
                {message.sender._id === user?.id && (
                  <div className="absolute top-2 right-2">
                    <MessageContextMenu
                      messageId={message._id}
                      content={message.content}
                      isOwnMessage={true}
                      isTextMessage={message.messageType === 'text'}
                      onReply={handleReplyToMessage}
                      onEdit={handleEditMessage}
                      onDelete={handleDeleteMessage}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between px-4 pb-2">
                  <p
                    className={`text-xs ${
                      message.sender._id === user?.id
                        ? 'text-indigo-100'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {formatTime(message.createdAt)}
                    {message.sender._id === user?.id && message.isRead && (
                      <span className="ml-2">✓✓</span>
                    )}
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
              onChange={(e) => setMessageText(e.target.value)}
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
    </div>
  );
}