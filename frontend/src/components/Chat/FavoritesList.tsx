'use client'

import { useCallback, useState, useEffect } from 'react';
import { Heart, Loader } from 'lucide-react';
import { buildAvatarUrl, createAuthHeaders, fetchJson, getUserApiUrl } from '@/utils/api';
import { useAuthStore } from '@/store/authStore';
import UserProfileCard from '@/components/User/UserProfileCard';

interface FavoriteUser {
  _id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  role: 'user' | 'moderator' | 'admin';
  isOnline: boolean;
}

interface FavoritesListProps {
  onOpenDirectMessage?: (userId: string) => void;
}

export default function FavoritesList({ onOpenDirectMessage }: FavoritesListProps) {
  const [favorites, setFavorites] = useState<FavoriteUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<FavoriteUser | null>(null);
  const { token } = useAuthStore();

  const fetchFavorites = useCallback(async () => {
    try {
      const data = await fetchJson<{ favorites?: FavoriteUser[] }>(`${getUserApiUrl()}/favorites`, {
        headers: createAuthHeaders(token),
      });
      setFavorites(data.favorites || []);
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="animate-spin text-gray-500" size={32} />
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 p-4 overflow-y-auto">
        {favorites.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 animate-fade-in">
            <Heart size={48} className="mx-auto mb-4 opacity-50" />
            <p>Нет избранных пользователей</p>
            <p className="text-sm mt-2">Добавьте пользователей в избранное</p>
          </div>
        ) : (
          <div className="space-y-2">
            {favorites.map((user) => (
              <button
                key={user._id}
                onClick={() => setSelectedUser(user)}
                className="w-full p-3 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden">
                      {buildAvatarUrl(user.avatar)
                        ? <img src={buildAvatarUrl(user.avatar)!} alt="avatar" className="w-full h-full object-cover" />
                        : user.username[0].toUpperCase()
                      }
                    </div>
                    {user.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {user.displayName || user.username}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      @{user.username}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {user.isOnline ? (
                      <span className="text-green-600 dark:text-green-400">В сети</span>
                    ) : (
                      <span>Не в сети</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedUser && (
        <UserProfileCard
          user={selectedUser}
          onClose={() => {
            setSelectedUser(null);
            fetchFavorites(); // Refresh list in case user was removed
          }}
          isOwnProfile={false}
          onOpenDirectMessage={onOpenDirectMessage}
        />
      )}
    </>
  );
}
