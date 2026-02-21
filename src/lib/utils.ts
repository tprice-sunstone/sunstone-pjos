import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

/**
 * Format a phone number to E.164 format for Twilio SMS.
 * Strips all non-digit characters, then prepends +1 if not already present.
 * Examples:
 *   "8014009693"       -> "+18014009693"
 *   "(801) 400-9693"   -> "+18014009693"
 *   "+18014009693"     -> "+18014009693"
 *   "18014009693"      -> "+18014009693"
 */
export function formatPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  // Already has country code or unusual length — prepend + if missing
  if (phone.startsWith('+')) {
    return `+${digits}`;
  }
  return `+1${digits}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 48);
}

export function generateQRData(tenantSlug: string, eventId?: string): string {
  const base = `${process.env.NEXT_PUBLIC_APP_URL}/waiver?tenant=${tenantSlug}`;
  return eventId ? `${base}&event=${eventId}` : base;
}