'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPushApiUrl } from '@/utils/api';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    view[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

// SW ready с таймаутом — не висим вечно
// Не используем navigator.serviceWorker.ready — он может зависнуть если SW в состоянии waiting
async function swReady(timeoutMs = 8000): Promise<ServiceWorkerRegistration> {
  // Сначала пробуем получить уже активную регистрацию
  const existing = await navigator.serviceWorker.getRegistration('/chat/');
  if (existing?.active) return existing;

  // Если нет — регистрируем и ждём активации
  const reg = await navigator.serviceWorker.register('/chat/sw.js', { scope: '/chat/' });

  // Если уже активен — возвращаем сразу
  if (reg.active) return reg;

  // Ждём активации с таймаутом
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Service worker activation timeout')), timeoutMs);

    const check = (reg: ServiceWorkerRegistration) => {
      const sw = reg.installing || reg.waiting || reg.active;
      if (!sw) return;
      sw.addEventListener('statechange', () => {
        if (sw.state === 'activated') {
          clearTimeout(timer);
          resolve(reg);
        }
      });
      // Принудительно активируем если застрял в waiting
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    };
    check(reg);
  });
}

export function usePushNotifications(token: string | null) {
  const [permission, setPermission] = useState<PermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSubscriptionStatus = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.getRegistration('/chat/');
      if (!reg) { setIsSubscribed(false); return; }
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
      setPermission(Notification.permission as PermissionState);
    } catch {
      setIsSubscribed(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission as PermissionState);

    // Unregister any old service workers (e.g. workbox from next-pwa)
    navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      for (const reg of registrations) {
        if (!reg.scope.endsWith('/chat/') || reg.active?.scriptURL.includes('workbox')) {
          await reg.unregister();
        }
      }
    });

    navigator.serviceWorker
      .register('/chat/sw.js', { scope: '/chat/' })
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      })
      .catch((err) => {
        console.error('[PWA] SW registration failed:', err);
        setError('Service worker не зарегистрировался: ' + err.message);
      });
  }, []);

  const subscribe = useCallback(async () => {
    setError(null);
    if (!token) {
      setError('Нет токена авторизации');
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as PermissionState);
      if (perm !== 'granted') {
        setError('Разрешение на уведомления не получено');
        return;
      }

      const reg = await swReady();

      const keyRes = await fetch(`${getPushApiUrl()}/vapid-public-key`);
      if (!keyRes.ok) throw new Error(`VAPID key fetch failed: ${keyRes.status}`);
      const keyData = await keyRes.json();
      const publicKey = keyData.publicKey;
      if (!publicKey) throw new Error(`VAPID publicKey missing in response: ${JSON.stringify(keyData)}`);

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      const saveRes = await fetch(`${getPushApiUrl()}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(subscription.toJSON())
      });
      if (!saveRes.ok) throw new Error(`Save subscription failed: ${saveRes.status}`);

      setIsSubscribed(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[PWA] Push subscription failed:', msg);
      setError(msg);
    }
  }, [token]);

  const unsubscribe = useCallback(async () => {
    setError(null);
    if (!token) return;

    try {
      const reg = await swReady();
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;

      await fetch(`${getPushApiUrl()}/unsubscribe`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ endpoint: sub.endpoint })
      });

      await sub.unsubscribe();
      setIsSubscribed(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[PWA] Unsubscribe failed:', msg);
      setError(msg);
    }
  }, [token]);

  return { permission, isSubscribed, subscribe, unsubscribe, error, refreshSubscriptionStatus };
}
