// ============================================================================
// Push Notifications — Capacitor client-side registration
// ============================================================================
// Only runs in the native shell (iOS/Android). On web it is a no-op.
// Requests permission, registers with APNs/FCM, POSTs the token to the
// server, and wires up foreground + tap handlers.
// ============================================================================

'use client';

import { toast } from 'sonner';
import { isNativeApp, getPlatform } from '@/lib/native';

let initialized = false;

/**
 * Initialize push notifications. Safe to call multiple times — it only
 * does the setup work once per session, and no-ops on web.
 */
export async function initPushNotifications(): Promise<void> {
  if (initialized) return;
  if (!isNativeApp()) return;

  initialized = true;

  try {
    // Dynamic import so the web bundle never pulls in the plugin
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const permStatus = await PushNotifications.checkPermissions();
    let receive = permStatus.receive;

    if (receive === 'prompt' || receive === 'prompt-with-rationale') {
      const req = await PushNotifications.requestPermissions();
      receive = req.receive;
    }

    if (receive !== 'granted') {
      console.log('[push] Permission not granted:', receive);
      return;
    }

    // Register with APNs/FCM — token arrives via the 'registration' event
    await PushNotifications.register();

    await PushNotifications.addListener('registration', async (tokenData) => {
      const token = tokenData.value;
      const platform = getPlatform(); // 'ios' | 'android' | 'web'
      try {
        const res = await fetch('/api/push/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, platform }),
        });
        if (!res.ok) {
          console.warn('[push] Failed to register token on server:', res.status);
        }
      } catch (err: any) {
        console.warn('[push] Register POST failed:', err.message);
      }
    });

    await PushNotifications.addListener('registrationError', (err) => {
      console.warn('[push] Registration error:', err.error);
    });

    // Foreground — show an in-app toast
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      const title = notification.title || 'New notification';
      const body = notification.body || '';
      try {
        toast(title, { description: body });
      } catch {
        // Toast may not be mounted yet — silent fail
      }
    });

    // User tapped a notification — handle deep-link
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = (action.notification.data || {}) as Record<string, string>;

      try {
        if (data.type === 'new_message') {
          const base = '/dashboard/clients';
          const dest = data.clientId ? `${base}/${data.clientId}` : base;
          if (typeof window !== 'undefined') {
            window.location.href = dest;
          }
        }
      } catch (err: any) {
        console.warn('[push] Tap handler error:', err.message);
      }
    });
  } catch (err: any) {
    // Keep the app alive — push is non-critical
    console.warn('[push] Init failed:', err.message);
  }
}
