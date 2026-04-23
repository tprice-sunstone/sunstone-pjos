import { isNativeApp } from './native';

/**
 * Returns true if the user can access subscription management UI.
 * On native (iOS/Android), subscription management is hidden —
 * Apple/Google IAP guidelines forbid external purchase mechanisms.
 */
export const canShowBillingUI = (): boolean => {
  return !isNativeApp();
};
