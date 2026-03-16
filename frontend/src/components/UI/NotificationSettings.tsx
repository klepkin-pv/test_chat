'use client'

import { useState, useEffect } from 'react';
import { Bell, X, AlertCircle, Check, Smartphone, Volume2, VolumeX } from 'lucide-react';
import { notificationManager } from '@/utils/notifications';
import { soundManager } from '@/utils/sounds';

interface NotificationSettingsProps {
  onClose: () => void;
  pushPermission?: 'default' | 'granted' | 'denied' | 'unsupported';
  pushSubscribed?: boolean;
  onPushSubscribe?: () => Promise<void>;
  onPushUnsubscribe?: () => Promise<void>;
  pushError?: string | null;
}

export default function NotificationSettings({
  onClose, pushPermission, pushSubscribed, onPushSubscribe, onPushUnsubscribe, pushError
}: NotificationSettingsProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [canRequest, setCanRequest] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => soundManager.isEnabled());

  useEffect(() => { updateStatus(); }, []);

  const updateStatus = () => {
    const p = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
    setPermission(p as NotificationPermission);
    setCanRequest(p !== 'denied' && 'Notification' in window);
    setIsEnabled(notificationManager.isEnabled());
  };

  const handleToggleNotifications = async () => {
    setIsLoading(true);
    try {
      if (isEnabled) { notificationManager.disable(); setIsEnabled(false); }
      else {
        const ok = await notificationManager.enable();
        updateStatus();
        if (ok) {
          setIsEnabled(true);
          notificationManager.showNotification('Уведомления включены', { body: 'Теперь вы будете получать уведомления', requireInteraction: false });
        }
      }
      updateStatus();
    } finally { setIsLoading(false); }
  };

  const handleTestNotification = async () => {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration('/chat/');
      if (reg) { reg.showNotification('Тестовое уведомление', { body: 'Уведомления работают', icon: '/chat/icons/icon-192.png', badge: '/chat/icons/badge-72.png' }); return; }
    }
    notificationManager.showNotification('Тестовое уведомление', { body: 'Проверка работы уведомлений', requireInteraction: false });
  };

  const handleTogglePush = async () => {
    setIsPushLoading(true);
    try {
      if (pushSubscribed) await onPushUnsubscribe?.();
      else { await onPushSubscribe?.(); updateStatus(); }
    } finally { setIsPushLoading(false); }
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.setEnabled(next);
    if (next) soundManager.playNotificationSound();
  };

  const getStatus = () => {
    if (permission === 'denied') return { type: 'error' as const, message: 'Уведомления заблокированы в браузере. Разрешите в настройках.' };
    if (permission === 'granted' && isEnabled) return { type: 'success' as const, message: 'Уведомления включены и работают' };
    if (permission === 'granted' && !isEnabled) return { type: 'warning' as const, message: 'Уведомления разрешены, но отключены' };
    return { type: 'info' as const, message: 'Уведомления не настроены' };
  };
  const status = getStatus();
  const statusBg = { success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700', error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700', warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700', info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' };
  const statusText = { success: 'text-green-800 dark:text-green-200', error: 'text-red-800 dark:text-red-200', warning: 'text-yellow-800 dark:text-yellow-200', info: 'text-blue-800 dark:text-blue-200' };

  const Toggle = ({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}
      className={`relative inline-flex h-6 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${on ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 animate-bounce-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Bell size={22} />Настройки уведомлений</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={24} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status */}
          <div className={`p-3 rounded-lg border ${statusBg[status.type]}`}>
            <div className="flex items-start gap-2">
              {status.type === 'success' ? <Check className="text-green-600 dark:text-green-400 mt-0.5 shrink-0" size={18} /> : <AlertCircle className={`mt-0.5 shrink-0 ${status.type === 'error' ? 'text-red-600' : status.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'}`} size={18} />}
              <p className={`text-sm ${statusText[status.type]}`}>{status.message}</p>
            </div>
          </div>

          {/* Браузерные уведомления */}
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-900 dark:text-white">Браузерные уведомления</p><p className="text-xs text-gray-500 dark:text-gray-400">Пока вкладка открыта</p></div>
            <Toggle on={isEnabled} onClick={handleToggleNotifications} disabled={isLoading || !canRequest} />
          </div>
          {isEnabled && (
            <button onClick={handleTestNotification} className="w-full px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              Показать тестовое уведомление
            </button>
          )}

          {/* Пуш */}
          {pushPermission !== 'unsupported' && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1"><Smartphone size={14} />Пуш-уведомления</p><p className="text-xs text-gray-500 dark:text-gray-400">Даже когда браузер закрыт</p></div>
                <Toggle on={!!pushSubscribed} onClick={handleTogglePush} disabled={isPushLoading} />
              </div>
              {pushPermission === 'denied' && <p className="text-xs text-red-600 dark:text-red-400">Заблокированы в браузере — разрешите в настройках</p>}
              {pushError && <p className="text-xs text-red-600 dark:text-red-400 break-all">Ошибка: {pushError}</p>}
              {pushSubscribed && !pushError && <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1"><Check size={11} />Устройство подписано</p>}
            </div>
          )}

          {/* Звуки */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">{soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}Звуки сообщений</p><p className="text-xs text-gray-500 dark:text-gray-400">Звук при получении сообщения</p></div>
            <Toggle on={soundEnabled} onClick={handleToggleSound} />
          </div>

          {/* Инструкция при denied */}
          {permission === 'denied' && (
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <p className="font-medium mb-1">Как разрешить уведомления:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Нажмите на иконку замка в адресной строке</li>
                <li>Найдите «Уведомления» → «Разрешить»</li>
                <li>Обновите страницу</li>
              </ol>
            </div>
          )}
        </div>

        <div className="flex justify-end p-5 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors">Готово</button>
        </div>
      </div>
    </div>
  );
}
