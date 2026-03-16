import webpush from 'web-push';
import { PushSubscription } from '../models/PushSubscription.js';

// Инициализируем лениво — только при первом вызове, когда env уже загружен
let initialized = false;
function initWebPush() {
  if (initialized) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL || 'mailto:admin@chatreal.app';

  if (!publicKey || !privateKey) {
    console.warn('[webPush] VAPID keys not set — push notifications disabled');
    return;
  }

  webpush.setVapidDetails(email, publicKey, privateKey);
  initialized = true;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;       // группировка — одинаковый tag заменяет предыдущий пуш
  data?: Record<string, unknown>;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  initWebPush();
  if (!initialized) {
    console.warn('[webPush] Not initialized — skipping push for user', userId);
    return;
  }
  const subscriptions = await PushSubscription.find({ user: userId });
  console.log(`[webPush] Sending to user ${userId}: ${subscriptions.length} subscription(s), title="${payload.title}"`);
  if (!subscriptions.length) return;

  const notification = JSON.stringify(payload);

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          notification
        );
        console.log(`[webPush] ✅ Sent to endpoint: ${sub.endpoint.slice(0, 60)}...`);
      } catch (err: any) {
        console.error(`[webPush] ❌ Failed: status=${err.statusCode}, body=${err.body}`);
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: sub._id });
          console.log('[webPush] Removed stale subscription');
        }
      }
    })
  );
  console.log('[webPush] Done, results:', results.map(r => r.status));
}
