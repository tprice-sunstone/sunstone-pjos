// ============================================================================
// Firebase Admin — Server-side push notification sender
// ============================================================================
// Initializes firebase-admin with service account credentials from
// FIREBASE_SERVICE_ACCOUNT_KEY env var (JSON string).
// Sends notifications via FCM HTTP v1 API, which routes to APNs for iOS.
// ============================================================================

import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

let app: App | null = null;

function getApp(): App | null {
  if (app) return app;

  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0];
    return app;
  }

  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) {
    console.warn('[firebase-admin] FIREBASE_SERVICE_ACCOUNT_KEY not set — push notifications disabled');
    return null;
  }

  try {
    const serviceAccount = JSON.parse(rawKey);
    app = initializeApp({
      credential: cert(serviceAccount),
    });
    return app;
  } catch (err: any) {
    console.error('[firebase-admin] Failed to initialize:', err.message);
    return null;
  }
}

function getMessagingInstance(): Messaging | null {
  const a = getApp();
  if (!a) return null;
  return getMessaging(a);
}

export interface PushPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Send a push notification to a single device token.
 * Returns { success, messageId } on success or { success: false, error, errorCode } on failure.
 * errorCode === 'messaging/registration-token-not-registered' means the token is dead and
 * should be marked is_active = false.
 */
export async function sendPushNotification({
  token,
  title,
  body,
  data,
}: PushPayload): Promise<SendResult> {
  const messaging = getMessagingInstance();
  if (!messaging) {
    return { success: false, error: 'Firebase Admin not initialized' };
  }

  // FCM requires all data values to be strings
  const stringData: Record<string, string> = {};
  if (data) {
    for (const [k, v] of Object.entries(data)) {
      stringData[k] = typeof v === 'string' ? v : String(v);
    }
  }

  try {
    const messageId = await messaging.send({
      token,
      notification: { title, body },
      data: stringData,
      apns: {
        payload: {
          aps: {
            alert: { title, body },
            sound: 'default',
            badge: 1,
          },
        },
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
    });
    return { success: true, messageId };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Unknown error',
      errorCode: err.code,
    };
  }
}

export interface MulticastPayload {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface MulticastResult {
  successCount: number;
  failureCount: number;
  results: Array<{ token: string; success: boolean; error?: string; errorCode?: string }>;
}

/**
 * Send a push notification to multiple device tokens.
 * Returns per-token results so callers can clean up dead tokens.
 */
export async function sendMulticastNotification({
  tokens,
  title,
  body,
  data,
}: MulticastPayload): Promise<MulticastResult> {
  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, results: [] };
  }

  // Fire in parallel. We don't use the deprecated sendMulticast API to keep
  // clearer per-token error reporting for cleanup of dead tokens.
  const settled = await Promise.all(
    tokens.map((token) => sendPushNotification({ token, title, body, data }))
  );

  const results = settled.map((r, i) => ({
    token: tokens[i],
    success: r.success,
    error: r.error,
    errorCode: r.errorCode,
  }));

  return {
    successCount: results.filter((r) => r.success).length,
    failureCount: results.filter((r) => !r.success).length,
    results,
  };
}
