import { useEffect, useRef } from 'react';
import { notificationManager } from '@/utils/notifications';

interface UseNotificationsProps {
  isWindowFocused: boolean;
  currentUserId?: string;
  currentRoomId?: string;
}

export const useNotifications = ({ 
  isWindowFocused, 
  currentUserId, 
  currentRoomId 
}: UseNotificationsProps) => {
  const lastNotificationTime = useRef<number>(0);
  const notificationCooldown = 2000; // 2 seconds cooldown between notifications

  const shouldShowNotification = (): boolean => {
    // Don't show notifications if window is focused
    if (isWindowFocused) {
      return false;
    }

    // Don't show notifications if not enabled
    if (!notificationManager.isEnabled()) {
      return false;
    }

    // Cooldown check
    const now = Date.now();
    if (now - lastNotificationTime.current < notificationCooldown) {
      return false;
    }

    lastNotificationTime.current = now;
    return true;
  };

  const showRoomMessageNotification = (
    message: any,
    roomName: string
  ) => {
    if (!shouldShowNotification()) return;

    // Don't notify for own messages
    if (message.sender._id === currentUserId) return;

    // Don't notify if not in current room (to avoid spam)
    if (currentRoomId && message.room !== currentRoomId) {
      return;
    }

    const content = message.messageType === 'text' 
      ? message.content 
      : message.messageType === 'image' 
        ? '📷 Изображение' 
        : '📎 Файл';

    notificationManager.showMessageNotification(
      message.sender.username,
      content,
      roomName
    );
  };

  const showDirectMessageNotification = (message: any) => {
    if (!shouldShowNotification()) return;

    // Don't notify for own messages
    if (message.sender._id === currentUserId) return;

    const content = message.messageType === 'text' 
      ? message.content 
      : message.messageType === 'image' 
        ? '📷 Изображение' 
        : '📎 Файл';

    notificationManager.showDirectMessageNotification(
      message.sender.username,
      content
    );
  };

  const showSystemNotification = (title: string, message: string) => {
    if (!notificationManager.isEnabled()) return;

    notificationManager.showSystemNotification(title, message);
  };

  // Request permission on mount if not already granted
  useEffect(() => {
    if (notificationManager.canRequest() && !notificationManager.isEnabled()) {
      // Don't auto-request, let user decide
      console.log('Notifications available but not enabled');
    }
  }, []);

  return {
    showRoomMessageNotification,
    showDirectMessageNotification,
    showSystemNotification,
    isEnabled: notificationManager.isEnabled(),
    canRequest: notificationManager.canRequest()
  };
};