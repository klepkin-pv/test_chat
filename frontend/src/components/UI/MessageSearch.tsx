'use client'

import { useState, useRef, useEffect } from 'react';
import { Search, X, ArrowUp, ArrowDown } from 'lucide-react';

interface SearchResult {
  _id: string;
  content: string;
  sender: {
    _id: string;
    username: string;
  };
  createdAt: string;
}

interface MessageSearchProps {
  roomId: string;
  onClose: () => void;
  onMessageSelect: (messageId: string) => void;
}

export default function MessageSearch({ roomId, onClose, onMessageSelect }: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const searchMessages = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/chat/rooms/${roomId}/search?q=${encodeURIComponent(query.trim())}`
        );
        
        if (response.ok) {
          const data = await response.json();
          setResults(data.messages || []);
          setSelectedIndex(-1);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchMessages, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, roomId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      onMessageSelect(results[selectedIndex]._id);
      onClose();
    }
  };

  const handleResultClick = (messageId: string) => {
    onMessageSelect(messageId);
    onClose();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.trim()})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 animate-slide-up">
          {/* Search Header */}
          <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Поиск сообщений..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {loading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-3 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search Results */}
          <div className="max-h-96 overflow-y-auto chat-scrollbar" ref={resultsRef}>
            {query.trim().length < 2 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Search size={48} className="mx-auto mb-4 opacity-50" />
                <p>Введите минимум 2 символа для поиска</p>
              </div>
            ) : results.length === 0 && !loading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Search size={48} className="mx-auto mb-4 opacity-50" />
                <p>Сообщения не найдены</p>
                <p className="text-sm mt-1">Попробуйте изменить поисковый запрос</p>
              </div>
            ) : (
              <div className="p-2">
                {results.map((message, index) => (
                  <button
                    key={message._id}
                    onClick={() => handleResultClick(message._id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      index === selectedIndex
                        ? 'bg-indigo-100 dark:bg-indigo-900'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-sm text-gray-900 dark:text-white">
                            {message.sender.username}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(message.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                          {highlightText(message.content, query)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {results.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
              <span>Найдено: {results.length} сообщений</span>
              <div className="flex items-center space-x-2">
                <ArrowUp size={12} />
                <ArrowDown size={12} />
                <span>для навигации</span>
                <span className="ml-2">Enter для перехода</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}