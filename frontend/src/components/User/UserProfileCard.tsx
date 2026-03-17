'use client'

import { useState, useEffect } from 'react';
import { X, MessageCircle, Ban, Shield, UserX, DoorOpen, Edit, Heart } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getAdminApiUrl, getUserApiUrl, getAuthApiUrl, buildAvatarUrl } from '@/utils/api';
import EditProfileModal from './EditProfileModal';

interface UserProfileCardProps {
  user: {
    _id: string;
    username: string;
    displayName?: string;
    avatar?: string;
    role: 'user' | 'moderator' | 'admin';
    isOnline?: boolean;
  };
  onClose: () => void;
  roomId?: string;
  isOwnProfile?: boolean;
  onOpenDirectMessage?: (userId: string) => void;
}

function getAvatarUrl(avatar?: string): string | null {
  return buildAvatarUrl(avatar);
}

export default function UserProfileCard({ user: initialUser, onClose, roomId, onOpenDirectMessage }: UserProfileCardProps) {
  const { user: currentUser, token, logout } = useAuthStore();
  const [user, setUser] = useState(initialUser);
  const [isLoading, setIsLoading] = useState(false);
  const [showBanForm, setShowBanForm] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAvatarFull, setShowAvatarFull] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [banForm, setBanForm] = useState({
    reason: '',
    duration: 0,
    scope: 'room' as 'room' | 'global'
  });

  const canManageRoles = currentUser?.role === 'admin';
  const canBan = currentUser?.role === 'moderator' || currentUser?.role === 'admin';
  const isSuperAdmin = user.username === 'admin' && user.role === 'admin';
  const isSelf = currentUser?.id === user._id;

  useEffect(() => {
    loadUserInfo();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUser._id]);

  const loadUserInfo = async () => {
    try {
      const response = await fetch(`${getAuthApiUrl()}/users/${initialUser._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUser({
          _id: data.user._id,
          username: data.user.username,
          displayName: data.user.displayName,
          avatar: data.user.avatar,
          role: data.user.role,
          isOnline: data.user.isOnline
        });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!isSelf) checkIfFavorite();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user._id, isSelf]);

  const checkIfFavorite = async () => {
    try {
      const response = await fetch(`${getUserApiUrl()}/favorites`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setIsFavorite(data.favorites.some((fav: any) => fav._id === user._id));
      }
    } catch {
      // ignore
    }
  };

  const handleRoleChange = async (newRole: 'user' | 'moderator' | 'admin') => {
    if (!canManageRoles || isSuperAdmin) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${getAdminApiUrl()}/users/${user._id}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role: newRole })
      });
      if (response.ok) { alert(`Роль изменена на ${newRole}`); onClose(); }
      else { const data = await response.json(); alert(data.error || 'Ошибка изменения роли'); }
    } catch {
      alert('Ошибка сети');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBan = async () => {
    if (!canBan || isSuperAdmin) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${getAdminApiUrl()}/users/${user._id}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...banForm, roomId: banForm.scope === 'room' ? roomId : null })
      });
      if (response.ok) { alert('Пользователь забанен'); onClose(); }
      else { const data = await response.json(); alert(data.error || 'Ошибка бана'); }
    } catch {
      alert('Ошибка сети');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectMessage = () => {
    if (onOpenDirectMessage) { onOpenDirectMessage(user._id); onClose(); }
  };

  const handleBlock = async () => {
    if (!window.confirm('Заблокировать пользователя?')) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${getUserApiUrl()}/blocks/${user._id}`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) { alert('Пользователь заблокирован'); onClose(); }
      else { const data = await response.json(); alert(data.error || 'Ошибка блокировки'); }
    } catch {
      alert('Ошибка сети');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToFavorites = async () => {
    setIsLoading(true);
    try {
      const method = isFavorite ? 'DELETE' : 'POST';
      const response = await fetch(`${getUserApiUrl()}/favorites/${user._id}`, {
        method, headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) setIsFavorite(!isFavorite);
      else { const data = await response.json(); alert(data.error || 'Ошибка'); }
    } catch {
      alert('Ошибка сети');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => { logout(); onClose(); };
  const handleClose = () => {
    setShowAvatarFull(false);
    setShowEditProfile(false);
    setShowBanForm(false);
    onClose();
  };

  const avatarSrc = isSelf
    ? getAvatarUrl(currentUser?.avatar)
    : getAvatarUrl(user.avatar);

  const displayedName = isSelf && currentUser?.displayName
    ? currentUser.displayName
    : (user.displayName || user.username);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>

        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => avatarSrc && setShowAvatarFull(true)}
              className={`w-16 h-16 rounded-full overflow-hidden bg-indigo-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 ${avatarSrc ? 'cursor-zoom-in' : 'cursor-default'}`}
            >
              {avatarSrc
                ? <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
                : user.username[0].toUpperCase()
              }
            </button>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{displayedName}</h3>
              <p className="text-sm text-gray-500">@{user.username}</p>
              <span className={`inline-block px-2 py-1 text-xs rounded mt-1 ${
                user.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                user.role === 'moderator' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }`}>
                {user.role === 'admin' ? 'Админ' : user.role === 'moderator' ? 'Модератор' : 'Пользователь'}
              </span>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        {isSuperAdmin && !isSelf && (
          <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 rounded text-sm text-yellow-800 dark:text-yellow-200">
            Супер-администратор защищен от изменений
          </div>
        )}

        {!isSelf && (
          <div className="space-y-2 mb-4">
            <button onClick={handleDirectMessage} disabled={isLoading}
              className="w-full flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50">
              <MessageCircle size={16} /> Написать
            </button>
            <button onClick={handleAddToFavorites} disabled={isLoading}
              className={`w-full flex items-center gap-2 px-4 py-2 text-white rounded disabled:opacity-50 ${isFavorite ? 'bg-gray-500 hover:bg-gray-600' : 'bg-pink-500 hover:bg-pink-600'}`}>
              <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
              {isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
            </button>
            <button onClick={handleBlock} disabled={isLoading}
              className="w-full flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded disabled:opacity-50">
              <Ban size={16} /> Заблокировать
            </button>
          </div>
        )}

        {isSelf && (
          <div className="mb-4 space-y-2">
            <button onClick={() => setShowEditProfile(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded">
              <Edit size={16} /> Редактировать профиль
            </button>
            <button onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded">
              <DoorOpen size={16} /> Выйти из аккаунта
            </button>
          </div>
        )}

        {canManageRoles && !isSelf && !isSuperAdmin && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Управление ролями</h4>
            <div className="space-y-2">
              <button onClick={() => handleRoleChange('user')} disabled={isLoading || user.role === 'user'}
                className="w-full flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded disabled:opacity-50 text-gray-900 dark:text-white">
                <UserX size={16} /> Сделать пользователем
              </button>
              <button onClick={() => handleRoleChange('moderator')} disabled={isLoading || user.role === 'moderator'}
                className="w-full flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 rounded disabled:opacity-50 text-blue-900 dark:text-blue-200">
                <Shield size={16} /> Сделать модератором
              </button>
              <button onClick={() => handleRoleChange('admin')} disabled={isLoading || user.role === 'admin'}
                className="w-full flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 rounded disabled:opacity-50 text-red-900 dark:text-red-200">
                <Shield size={16} /> Сделать админом
              </button>
            </div>
          </div>
        )}

        {canBan && !isSelf && !isSuperAdmin && (
          <div>
            {!showBanForm ? (
              <button onClick={() => setShowBanForm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded">
                <Ban size={16} /> Забанить пользователя
              </button>
            ) : (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Забанить пользователя</h4>
                <input type="text" value={banForm.reason} onChange={(e) => setBanForm({ ...banForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Причина бана" />
                <input type="number" min="0" value={banForm.duration} onChange={(e) => setBanForm({ ...banForm, duration: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Длительность (часов, 0 = навсегда)" />
                <select value={banForm.scope} onChange={(e) => setBanForm({ ...banForm, scope: e.target.value as 'room' | 'global' })}
                  disabled={currentUser?.role === 'moderator'}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50">
                  <option value="room">Только этот чат</option>
                  <option value="global">Все чаты + личные сообщения</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={() => setShowBanForm(false)} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded">Отмена</button>
                  <button onClick={handleBan} disabled={isLoading || !banForm.reason}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50">Забанить</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showAvatarFull && avatarSrc && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60]"
          onClick={() => setShowAvatarFull(false)}>
          <img src={avatarSrc} alt="avatar" className="max-w-[90vw] max-h-[90vh] rounded-lg object-contain" />
        </div>
      )}

      {showEditProfile && currentUser && (
        <EditProfileModal
          currentUsername={currentUser.username}
          currentDisplayName={currentUser.displayName || ''}
          currentAvatar={currentUser.avatar}
          onClose={() => setShowEditProfile(false)}
          onSuccess={(newAvatar) => {
            if (newAvatar) setUser(prev => ({ ...prev, avatar: newAvatar }));
          }}
        />
      )}
    </div>
  );
}
