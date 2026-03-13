import { useEffect } from 'react';
import { faviconManager } from '@/utils/favicon';

export const usePageTitle = (unreadCount: number) => {
  useEffect(() => {
    const baseTitle = 'Chat Real';
    
    if (unreadCount > 0) {
      document.title = `(${unreadCount > 99 ? '99+' : unreadCount}) ${baseTitle}`;
      faviconManager.updateBadge(unreadCount);
    } else {
      document.title = baseTitle;
      faviconManager.clearBadge();
    }
  }, [unreadCount]);
};