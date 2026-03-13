'use client'

import { useState, useEffect } from 'react';
import { Bell, BellOff, X, AlertCircle, Check } from 'lucide-react';
import { notificationManager } from '@/utils/notifications';

interface NotificationSettingsProps {
  onClose: () => void;
}

export default function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [canRequest, setCanRequest] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    updateStatus();
  }, []);

  const updateStatus = () => {
    setIsEnabled(notificationManager.isEnabled());
    setCanRequest(notificationManager.canRequest());
    setPermission(Notification.permission);
  };

  const handleToggleNotifications = async () => {
    setIsLoading(true);
    
    try {
      if (isEnabled) {
        notificationManager.disable();
        setIsEnabled(false);
      } else {
        const success = await notificationManager.enable();
        if (success) {
          setIsEnabled(true);
          // Show test notification
          notificationManager.showNotification('Уведомления включены', {
            body: 'Теперь вы будете получать уведомления о новых сообщениях',
            requireInteraction: false
          });
        }
      }
      updateStatus();
    } catch (error) {
      console.error('Error toggling notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = () => {
    notificationManager.showNotification('Тестовое уведомление', {
      body: 'Это тестовое уведомление для проверки работы',
      requireInteraction: false
    });
  };

  const getStatusMessage = () => {
    if (permission === 'denied') {
      return {
        type: 'error' as const,
        message: 'Уведомления заблокированы в браузере. Разрешите уведомления в настройках браузера.'
      };
    }
    
    if (permission === 'granted' && isEnabled) {
      return {
        type: 'success' as const,
        message: 'Уведомления включены и работают'
      };
    }
    
    if (permission === 'granted' && !isEnabled) {
      return {
        type: 'warning' as const,
        message: 'Уведомления разрешены, но отключены'
      };
    }
    
    return {
      type: 'info' as const,
      message: 'Уведомления не настроены'
    };
  };

  const status = getStatusMessage();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 animate-bounce-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <Bell size={24} className="mr-2" />
            Настройки уведомлений
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status */}
          <div className={`p-4 rounded-lg border ${
            status.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' :
            status.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700' :
            status.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700' :
            'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
          }`}>
            <div className="flex items-start space-x-3">
              {status.type === 'success' && <Check className="text-green-600 dark:text-green-400 mt-0.5" size={20} />}
              {status.type === 'error' && <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5" size={20} />}
              {status.type === 'warning' && <AlertCircle className="text-yellow-600 dark:text-yellow-400 mt-0.5" size={20} />}
              {status.type === 'info' && <AlertCircle className="text-blue-600 dark:text-blue-400 mt-0.5" size={20} />}
              <p className={`text-sm ${
                status.type === 'success' ? 'text-green-800 dark:text-green-200' :
                status.type === 'error' ? 'text-red-800 dark:text-red-200' :
                status.type === 'warning' ? 'text-yellow-800 dark:text-yellow-200' :
                'text-blue-800 dark:text-blue-200'
              }`}>
                {status.message}
              </p>
            </div>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Браузерные уведомления
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Получать уведомления о новых сообщениях
              </p>
            </div>
            <button
              onClick={handleToggleNotifications}
              disabled={isLoading || !canRequest}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Description */}
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>
              <strong>Когда вы получите уведомления:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Новые сообщения в групповых чатах</li>
              <li>Новые приватные сообщения</li>
              <li>Упоминания вашего имени</li>
              <li>Системные уведомления</li>
            </ul>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
              Уведомления показываются только когда вкладка неактивна
            </p>
          </div>

          {/* Test button */}
          {isEnabled && (
            <button
              onClick={handleTestNotification}
              className="w-full px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Показать тестовое уведомление
            </button>
          )}

          {/* Browser help */}
          {permission === 'denied' && (
            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <p className="font-medium mb-2">Как разрешить уведомления:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Нажмите на иконку замка в адресной строке</li>
                <li>Найдите "Уведомления" и выберите "Разрешить"</li>
                <li>Обновите страницу</li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}