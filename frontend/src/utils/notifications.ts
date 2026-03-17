export class NotificationManager {
  private enabled: boolean = false;
  private permission: NotificationPermission = 'default';

  constructor() {
    if (typeof window !== 'undefined') {
      this.checkPermission();
      this.loadSettings();
    }
  }

  private checkPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  private loadSettings() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notifications_enabled');
      this.enabled = saved === 'true';
    }
  }

  private saveSettings() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('notifications_enabled', this.enabled.toString());
    }
  }

  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission === 'denied') {
      return false;
    }

    try {
      this.permission = await Notification.requestPermission();
      return this.permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async enable(): Promise<boolean> {
    const hasPermission = await this.requestPermission();
    if (hasPermission) {
      this.enabled = true;
      this.saveSettings();
      return true;
    }
    return false;
  }

  disable() {
    this.enabled = false;
    this.saveSettings();
  }

  isEnabled(): boolean {
    return this.enabled && this.permission === 'granted';
  }

  canRequest(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window && this.permission !== 'denied';
  }

  showNotification(title: string, options: {
    body?: string;
    icon?: string;
    tag?: string;
    data?: any;
    requireInteraction?: boolean;
  } = {}) {
    if (typeof window === 'undefined' || !this.isEnabled()) {
      return null;
    }

    try {
      const notification = new Notification(title, {
        body: options.body,
        icon: options.icon || '/favicon.svg',
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction || false,
        silent: false
      });

      // Auto close after 5 seconds unless requireInteraction is true
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  showMessageNotification(sender: string, message: string, roomName?: string) {
    const title = roomName ? `${sender} в ${roomName}` : sender;
    const body = this.truncateMessage(message);
    
    return this.showNotification(title, {
      body,
      tag: roomName ? `room-${roomName}` : `dm-${sender}`,
      data: { sender, roomName, message }
    });
  }

  showDirectMessageNotification(sender: string, message: string) {
    return this.showNotification(`Сообщение от ${sender}`, {
      body: this.truncateMessage(message),
      tag: `dm-${sender}`,
      data: { sender, message, type: 'direct' }
    });
  }

  showRoomNotification(roomName: string, message: string) {
    return this.showNotification(`Новое сообщение в ${roomName}`, {
      body: this.truncateMessage(message),
      tag: `room-${roomName}`,
      data: { roomName, message, type: 'room' }
    });
  }

  showSystemNotification(title: string, message: string) {
    return this.showNotification(title, {
      body: message,
      tag: 'system',
      requireInteraction: true,
      data: { type: 'system' }
    });
  }

  private truncateMessage(message: string, maxLength: number = 100): string {
    if (message.length <= maxLength) {
      return message;
    }
    return message.substring(0, maxLength - 3) + '...';
  }

  // Clear all notifications with specific tag
  clearNotifications(_tag?: string) {
    if (typeof window === 'undefined') return;
    // Note: There's no standard way to clear notifications programmatically
    // This is a placeholder for future implementation
    void _tag;
  }
}

export const notificationManager = typeof window !== 'undefined' ? new NotificationManager() : null as any;
