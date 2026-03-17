import webpush from 'web-push';
import { PushSubscription } from '../models/PushSubscription.js';
import { logger } from './logger.js';

let initialized = false;

function initWebPush() {
  if (initialized) {
    return;
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL || 'mailto:admin@chatreal.app';

  if (!publicKey || !privateKey) {
    logger.warn('[webPush] VAPID keys not set, push notifications disabled');
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
  tag?: string;
  data?: Record<string, unknown>;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  initWebPush();
  if (!initialized) {
    logger.warn('[webPush] Not initialized, skipping push', { userId });
    return;
  }

  const subscriptions = await PushSubscription.find({ user: userId });
  logger.debug('[webPush] Sending push payload', {
    userId,
    subscriptions: subscriptions.length,
    title: payload.title,
  });

  if (!subscriptions.length) {
    return;
  }

  const notification = JSON.stringify(payload);

  const results = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: subscription.keys },
          notification
        );
        logger.debug('[webPush] Sent notification', {
          endpoint: subscription.endpoint.slice(0, 60),
        });
      } catch (error: any) {
        logger.error('[webPush] Failed to send notification', {
          statusCode: error.statusCode,
          body: error.body,
        });

        if (error.statusCode === 410 || error.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: subscription._id });
          logger.info('[webPush] Removed stale subscription');
        }
      }
    })
  );

  logger.debug('[webPush] Push send results', results.map((result) => result.status));
}
