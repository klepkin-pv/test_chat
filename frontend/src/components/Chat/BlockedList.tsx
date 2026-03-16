'use client'

import { useState, useEffect } from 'react';
import { Ban, Loader, UserX } from 'lucide-react';
import { getUserApiUrl } from '@/utils/api';
import { useAuthStore } from '@/store/authStore';

interface BlockedUser {
  _id: string;
  username: string;
  displayName?: string;
  role: 'user' | 'moderator' | 'admin';
  isOnline: boolean;
}

export default function BlockedList() {
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();

  useEffect(() => {
    fetchBlocked();
  }, []);

  const fetchBlocked = async () => {
    try {
      const response = await fetch(`${getUserApiUrl()}/blocks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBlocked(data.blocks || []);
      }
    } catch {
      console.error('Failed to fetch blocked users');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId: string) => {
    if (!window.confirm('Разблокировать этого пользователя?')) {
      return;
    }

    try {
      const response = await fetch(`${getUserApiUrl()}/blocks/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setBlocked(blocked.filter(u => u._id !== userId));
      } else {
        alert('Ошибка разблокировки');
      }
    } catch {
      alert('Ошибка сети');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="animate-spin text-gray-500" size={32} />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      {blocked.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 animate-fade-in">
          <Ban size={48} className="mx-auto mb-4 opacity-50" />
          <p>Нет заблокированных пользователей</p>
        </div>
      ) : (
        <div className="space-y-2">
          {blocked.map((user) => (
            <div
              key={user._id}
              className="p-3 rounded-lg bg-white dark:bg-gray-700"
            >
              <div className="flex items-center gap-3">
                <div className="relative opacity-50">
                  <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white font-semibold">
                    {user.username[0].toUpperCase()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {user.displayName || user.username}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    @{user.username}
                  </p>
                </div>
                <button
                  onClick={() => handleUnblock(user._id)}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded"
                >
                  <UserX size={14} />
                  Разблокировать
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
