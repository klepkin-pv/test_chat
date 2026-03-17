'use client'

import { useState, useRef } from 'react';
import { X, Save, Lock, Camera } from 'lucide-react';
import { getChatApiUrl, buildAvatarUrl } from '@/utils/api';
import { useAuthStore } from '@/store/authStore';

interface EditRoomModalProps {
  roomId: string;
  currentName: string;
  currentDescription?: string;
  currentIsPrivate?: boolean;
  currentAvatar?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditRoomModal({ 
  roomId, currentName, currentDescription = '', currentIsPrivate = false, currentAvatar, onClose, onSuccess 
}: EditRoomModalProps) {
  const [name, setName] = useState(currentName);
  const [description, setDescription] = useState(currentDescription);
  const [isPrivate, setIsPrivate] = useState(currentIsPrivate);
  const [password, setPassword] = useState('');
  const [changePassword, setChangePassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { token } = useAuthStore();

  const getDisplayAvatar = (url?: string) => buildAvatarUrl(url);

  const prepareAvatarDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Не удалось обработать изображение'));
      image.onload = () => {
        const maxSide = 512;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Не удалось подготовить изображение'));
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', 0.85));
      };
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    try {
      const preparedAvatar = await prepareAvatarDataUrl(file);
      setAvatarFile(file);
      setAvatarPreview(preparedAvatar);
    } catch (avatarError) {
      setAvatarFile(null);
      setAvatarPreview(null);
      setError(avatarError instanceof Error ? avatarError.message : 'Не удалось подготовить аватарку');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Название комнаты обязательно'); return; }
    if (isPrivate && changePassword && !password.trim()) { setError('Введите пароль'); return; }

    setIsLoading(true);
    setError('');

    try {
      const body: any = { name: name.trim(), description: description.trim(), isPrivate };
      if (isPrivate && changePassword && password) body.password = password;
      if (!isPrivate) body.isPrivate = false;
      if (avatarFile) {
        if (!avatarPreview) {
          setError('Аватарка еще не подготовилась, попробуйте снова');
          return;
        }
        body.avatarDataUrl = avatarPreview;
      }

      const response = await fetch(`${getChatApiUrl()}/rooms/${roomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });

      if (response.ok) { onSuccess(); onClose(); }
      else { const data = await response.json(); setError(data.error || 'Ошибка при обновлении'); }
    } catch {
      setError('Ошибка сети');
    } finally {
      setIsLoading(false);
    }
  };

  const displayedAvatar = avatarPreview || getDisplayAvatar(currentAvatar);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Редактировать комнату</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-sm">{error}</div>}

          <div className="flex justify-center">
            <div className="relative">
              <div
                className="w-20 h-20 rounded-full overflow-hidden bg-gray-300 dark:bg-gray-600 flex items-center justify-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {displayedAvatar
                  ? <img src={displayedAvatar} alt="avatar" className="w-full h-full object-cover" />
                  : <span className="text-gray-500 text-3xl font-bold">{currentName[0].toUpperCase()}</span>
                }
              </div>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-white hover:bg-indigo-700">
                <Camera size={14} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              maxLength={50} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Описание</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              rows={3} maxLength={200} />
            <p className="text-xs text-gray-500 mt-1">{description.length}/200</p>
          </div>

          <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-md">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Приватная комната</span>
            </div>
            <button type="button" onClick={() => { setIsPrivate(!isPrivate); setChangePassword(false); setPassword(''); }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPrivate ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPrivate ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {isPrivate && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={changePassword} onChange={(e) => setChangePassword(e.target.checked)} className="rounded border-gray-300 text-indigo-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Изменить пароль</span>
              </label>
              {changePassword && (
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Новый пароль" />
              )}
            </div>
          )}

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
