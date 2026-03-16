'use client'

import { useState } from 'react';
import { X, Search } from 'lucide-react';
import { getDirectApiUrl } from '@/utils/api';

interface User {
  _id: string;
  username: string;
  isOnline: boolean;
}

interface UserSearchModalProps {
  onClose: () => void;
  onSelectUser: (user: User) => void;
  currentUserId?: string;
  token: string | null;
}

export default function UserSearchModal({ onClose, onSelectUser, currentUserId, token }: UserSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${getDirectApiUrl()}/users/search?q=${encodeURIComponent(q)}`, {
        headers: {
          'Authorization': `Bearer ${token || localStorage.getItem('token')}`,
          'userid': currentUserId || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.users || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Начать чат</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20} /></button>
        </div>
        <div className="p-4">
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); search(e.target.value); }}
              placeholder="Поиск пользователей..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <p className="text-center py-4 text-gray-500">Поиск...</p>
            ) : results.length === 0 && query.length >= 2 ? (
              <p className="text-center py-4 text-gray-500">Не найдено</p>
            ) : (
              results.map(u => (
                <button key={u._id} onClick={() => onSelectUser(u)}
                  className="w-full p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-left flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {u.username[0].toUpperCase()}
                    </div>
                    {u.isOnline && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{u.username}</p>
                    <p className="text-sm text-gray-500">{u.isOnline ? 'В сети' : 'Не в сети'}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
