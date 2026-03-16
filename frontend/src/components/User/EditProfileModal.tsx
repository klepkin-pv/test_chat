'use client'

import { useState, useRef } from 'react';
import { X, Save, Camera } from 'lucide-react';
import { getAuthApiUrl } from '@/utils/api';
import { useAuthStore } from '@/store/authStore';

interface EditProfileModalProps {
  currentUsername: string;
  currentDisplayName?: string;
  currentAvatar?: string;
  onClose: () => void;
  onSuccess: (newAvatar?: string) => void;
}

export default function EditProfileModal({ 
  currentUsername,
  currentDisplayName = '',
  currentAvatar,
  onClose, 
  onSuccess 
}: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { token, updateUser } = useAuthStore();

  const getAvatarUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${getAuthApiUrl().replace('/auth', '')}${url}`;
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password && password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let newAvatar: string | undefined;

      // Upload avatar first if selected
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        const avatarRes = await fetch(`${getAuthApiUrl()}/avatar`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        if (avatarRes.ok) {
          const data = await avatarRes.json();
          newAvatar = data.avatar;
        }
      }

      // Update profile
      const updateData: any = { displayName: displayName.trim() };
      if (password) updateData.password = password;

      const response = await fetch(`${getAuthApiUrl()}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const data = await response.json();
        updateUser({
          displayName: data.user.displayName,
          ...(newAvatar ? { avatar: newAvatar } : {})
        });
        onSuccess(newAvatar);
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка при обновлении профиля');
      }
    } catch {
      setError('Ошибка сети');
    } finally {
      setIsLoading(false);
    }
  };

  const displayedAvatar = avatarPreview || getAvatarUrl(currentAvatar);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Редактировать профиль</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-sm">{error}</div>
          )}

          {/* Avatar */}
          <div className="flex justify-center">
            <div className="relative">
              <div
                className="w-20 h-20 rounded-full overflow-hidden bg-indigo-500 flex items-center justify-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {displayedAvatar ? (
                  <img src={displayedAvatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-3xl font-bold">{currentUsername[0].toUpperCase()}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-white hover:bg-indigo-700"
              >
                <Camera size={14} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Имя пользователя (нельзя изменить)
            </label>
            <input type="text" value={currentUsername} disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Отображаемое имя</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Ваше имя" maxLength={50} />
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Оставьте пустым, если не хотите менять пароль</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Новый пароль</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Новый пароль" minLength={6} />
              </div>
              {password && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Подтвердите пароль</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Подтвердите пароль" minLength={6} />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
              Отмена
            </button>
            <button type="submit" disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">
              <Save size={16} />
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
