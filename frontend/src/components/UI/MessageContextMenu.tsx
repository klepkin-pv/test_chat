'use client'

import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Reply, Edit, Trash2, Copy } from 'lucide-react';

interface MessageContextMenuProps {
  messageId: string;
  content: string;
  isOwnMessage: boolean;
  isTextMessage: boolean;
  onReply: (messageId: string) => void;
  onEdit: (messageId: string) => void;
  onDelete: (messageId: string) => void;
  className?: string;
}

export default function MessageContextMenu({
  messageId,
  content,
  isOwnMessage,
  isTextMessage,
  onReply,
  onEdit,
  onDelete,
  className = ''
}: MessageContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const handleReply = () => {
    onReply(messageId);
    setIsOpen(false);
  };

  const handleEdit = () => {
    onEdit(messageId);
    setIsOpen(false);
  };

  const handleDelete = () => {
    onDelete(messageId);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all rounded"
        title="More options"
      >
        <MoreHorizontal size={16} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-20 min-w-[120px] animate-fade-in">
          {/* Reply */}
          <button
            onClick={handleReply}
            className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
          >
            <Reply size={14} />
            <span>Ответить</span>
          </button>

          {/* Copy */}
          {isTextMessage && (
            <button
              onClick={handleCopy}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
            >
              <Copy size={14} />
              <span>Копировать</span>
            </button>
          )}

          {/* Edit (only for own text messages) */}
          {isOwnMessage && isTextMessage && (
            <button
              onClick={handleEdit}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
            >
              <Edit size={14} />
              <span>Изменить</span>
            </button>
          )}

          {/* Delete (only for own messages) */}
          {isOwnMessage && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
              <button
                onClick={handleDelete}
                className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
              >
                <Trash2 size={14} />
                <span>Удалить</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}