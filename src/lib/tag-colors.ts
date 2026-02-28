// ============================================================================
// Tag Color Palette — theme-independent fixed colors
// ============================================================================
// Each entry has an rgba background (12% opacity) and a hex text color.
// These look good on both light and dark themes.

export interface TagColor {
  bg: string;   // rgba background
  text: string;  // hex text color
  label: string;
}

export const TAG_PALETTE: TagColor[] = [
  { bg: 'rgba(100, 116, 139, 0.12)', text: '#64748B', label: 'Slate' },
  { bg: 'rgba(220, 38, 38, 0.12)',   text: '#DC2626', label: 'Red' },
  { bg: 'rgba(234, 88, 12, 0.12)',   text: '#EA580C', label: 'Orange' },
  { bg: 'rgba(217, 119, 6, 0.12)',   text: '#D97706', label: 'Amber' },
  { bg: 'rgba(5, 150, 105, 0.12)',   text: '#059669', label: 'Green' },
  { bg: 'rgba(13, 148, 136, 0.12)',  text: '#0D9488', label: 'Teal' },
  { bg: 'rgba(37, 99, 235, 0.12)',   text: '#2563EB', label: 'Blue' },
  { bg: 'rgba(99, 102, 241, 0.12)',  text: '#6366F1', label: 'Indigo' },
  { bg: 'rgba(124, 58, 237, 0.12)',  text: '#7C3AED', label: 'Purple' },
  { bg: 'rgba(236, 72, 153, 0.12)',  text: '#EC4899', label: 'Pink' },
  { bg: 'rgba(244, 63, 94, 0.12)',   text: '#F43F5E', label: 'Rose' },
  { bg: 'rgba(20, 184, 166, 0.12)',  text: '#14B8A6', label: 'Cyan' },
];

/**
 * Get the tag color entry for a given hex color.
 * Falls back to computing an rgba bg from the hex with 12% opacity.
 */
export function getTagColor(hex: string): { bg: string; text: string } {
  const match = TAG_PALETTE.find((p) => p.text.toLowerCase() === hex.toLowerCase());
  if (match) return { bg: match.bg, text: match.text };
  // Compute rgba from hex
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { bg: `rgba(${r}, ${g}, ${b}, 0.12)`, text: hex };
}
