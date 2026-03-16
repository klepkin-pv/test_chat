'use client'

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { X, Shield, ShieldOff, Ban, UserX } from 'lucide-react';

interface UserCardProps {
  user: {
    _id: string;
    username: string;
    displayName: string;
    role: 'user' | 'moderator' | 'admin';
    isOnline: boolean;
  };
  onClose: () => void;
  roomId?: string;
}

export default function UserCard({ user, onClose, roomId }: UserCardProps) {
  const { user: currentUser, token } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [banForm, setBanForm] = useState({
    reason: '',
    duration: 0, // 0 = permanent
    scope: 'room' as 'room' | 'global'
  });

  const canManageRoles = currentUser?.role === 'admin';
  const canBan = currentUser?.role === 'moderator' || currentUser?.role === 'admin';
  const isSuperAdmin = user.username === 'admin' && user.role === 'admin';
  const isSelf = currentUser?.id === user._id;

  if (isSelf || isSuperAdmin) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {user.displayName}
            </h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {isSelf ? 'Это вы' : 'Супер-администратор защищен от изменений'}
          </p>
        </div>
      </div>
    );
  }

  const handleRoleChange = async (newRole: 'user' | 'moderator' | 'admin') => {
    if (!canManageRoles) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/users/${user._id}/role`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ role: newRole })
        }
      );

      if (response.ok) {
        alert(`Роль изменена на ${newRole}`);
        onClose();
      } else {
        const data = await response.json();
        alert(data.error || 'Ошибка изменения роли');
      }
    } catch {
      alert('Ошибка сети');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBan = async () => {
    if (!canBan) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/users/${user._id}/ban`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...banForm,
            roomId: banForm.scope === 'room' ? roomId : null
          })
        }
      );

      if (response.ok) {
        alert('Пользователь забанен');
        onClose();
      } else {
        const data = await response.json();
        alert(data.error || 'Ошибка бана');
      }
    } catch {
      alert('Ошибка сети');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {user.displayName}
            </h3>
            <p className="text-sm text-gray-500">@{user.username}</p>
            <span className={`inline-block px-2 py-1 text-xs rounded mt-1 ${
              user.role === 'admin' ? 'bg-red-100 text-red-800' :
              user.role === 'moderator' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {user.role === 'admin' ? 'Админ' : user.role === 'moderator' ? 'Модератор' : 'Пользователь'}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {canManageRoles && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Управление ролями
            </h4>
            <div className="space-y-2">
              <button
                onClick={() => handleRoleChange('user')}
                disabled={isLoading || user.role === 'user'}
                className="w-full flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded disabled:opacity-50"
              >
                <UserX size={16} />
                Сделать пользователем
              </button>
              <button
                onClick={() => handleRoleChange('moderator')}
                disabled={isLoading || user.role === 'moderator'}
                className="w-full flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 rounded disabled:opacity-50"
              >
                <Shield size={16} />
                Сделать модератором
              </button>
              <button
                onClick={() => handleRoleChange('admin')}
                disabled={isLoading || user.role === 'admin'}
                className="w-full flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 rounded disabled:opacity-50"
              >
                <ShieldOff size={16} />
                Сделать админом
              </button>
            </div>
          </div>
        )}

        {canBan && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Забанить пользователя
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Причина
                </label>
                <input
                  type="text"
                  value={banForm.reason}
                  onChange={(e) => setBanForm({ ...banForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Укажите причину бана"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Длительность (часов, 0 = навсегда)
                </label>
                <input
                  type="number"
                  min="0"
                  value={banForm.duration}
                  onChange={(e) => setBanForm({ ...banForm, duration: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Область бана
                </label>
                <select
                  value={banForm.scope}
                  onChange={(e) => setBanForm({ ...banForm, scope: e.target.value as 'room' | 'global' })}
                  disabled={currentUser?.role === 'moderator'}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50"
                >
                  <option value="room">Только этот чат</option>
                  <option value="global">Все чаты + личные сообщения</option>
                </select>
                {currentUser?.role === 'moderator' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Модераторы могут банить только в комнатах
                  </p>
                )}
              </div>

              <button
                onClick={handleBan}
                disabled={isLoading || !banForm.reason}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
              >
                <Ban size={16} />
                Забанить
              </button>
            </div>
          </div>
        )}

        {!canManageRoles && !canBan && (
          <p className="text-gray-600 dark:text-gray-400 text-center">
            У вас нет прав для управления этим пользователем
          </p>
        )}
      </div>
    </div>
  );
}
