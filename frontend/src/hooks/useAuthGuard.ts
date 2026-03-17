'use client'

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getAuthApiUrl } from '@/utils/api';

/**
 * При старте проверяет токен через /auth/me и синхронизирует данные пользователя
 * (включая avatar, displayName, role) из базы данных в authStore.
 * Если токен протух — разлогиниваем.
 * Каждые 30 минут обновляет токен через /auth/refresh.
 */
export function useAuthGuard() {
  const { token, login, logout, updateUser } = useAuthStore();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!token || checkedRef.current) return;
    checkedRef.current = true;

    const verify = async () => {
      try {
        // Сначала получаем актуальные данные пользователя
        const meRes = await fetch(`${getAuthApiUrl()}/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (meRes.status === 401) {
          logout();
          return;
        }

        if (meRes.ok) {
          const meData = await meRes.json();
          // Синхронизируем все поля включая avatar
          updateUser({
            username: meData.user.username,
            displayName: meData.user.displayName,
            avatar: meData.user.avatar,
            role: meData.user.role,
          });

          // Обновляем токен (продлеваем сессию)
          const refreshRes = await fetch(`${getAuthApiUrl()}/refresh`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            login(data.user, data.token);
          }
        }
      } catch {
        // сеть недоступна — не разлогиниваем
      }
    };

    verify();

    const interval = setInterval(verify, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [token, login, logout, updateUser]);
}
