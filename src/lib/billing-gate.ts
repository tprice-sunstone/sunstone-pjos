import { isNativeApp } from './native';

/**
 * Returns true if the user can access subscription management UI.
 * On native (iOS/Android), subscription management is hidden —
 * Apple/Google IAP guidelines forbid external purchase mechanisms.
 */
export const canShowBillingUI = (): boolean => {
  return !isNativeApp();
};

/**
 * URL to redirect native users to for billing management.
 * Opens in the device's default browser (outside the app).
 * Kept for reference — NOT displayed as text in native UI.
 */
export const BILLING_WEB_URL = 'https://sunstonepj.app/dashboard/settings?tab=subscription';

export const NATIVE_SUPPORT_EMAIL = 'support@sunstonepj.app';
export const NATIVE_INACTIVE_MESSAGE =
  'Your Sunstone Studio access is currently inactive. Please contact support for assistance.';
