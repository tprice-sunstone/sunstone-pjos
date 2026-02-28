// ============================================================================
// Tag Color Palette — luxury, theme-independent fixed colors
// ============================================================================
// 10-color palette with rgba backgrounds (15% opacity) and hex text colors.
// These look good on both light and dark themes.

export interface TagColor {
  bg: string;   // rgba background
  text: string;  // hex text color
  label: string;
}

export const TAG_PALETTE: TagColor[] = [
  { bg: 'rgba(201, 169, 110, 0.15)', text: '#C9A96E', label: 'Gold' },
  { bg: 'rgba(183, 110, 121, 0.15)', text: '#B76E79', label: 'Rose' },
  { bg: 'rgba(125, 142, 110, 0.15)', text: '#7D8E6E', label: 'Sage' },
  { bg: 'rgba(107, 127, 153, 0.15)', text: '#6B7F99', label: 'Blue' },
  { bg: 'rgba(156, 139, 122, 0.15)', text: '#9C8B7A', label: 'Taupe' },
  { bg: 'rgba(192, 120, 80, 0.15)',  text: '#C07850', label: 'Copper' },
  { bg: 'rgba(139, 110, 127, 0.15)', text: '#8B6E7F', label: 'Plum' },
  { bg: 'rgba(122, 139, 140, 0.15)', text: '#7A8B8C', label: 'Slate' },
  { bg: 'rgba(212, 160, 167, 0.15)', text: '#D4A0A7', label: 'Blush' },
  { bg: 'rgba(92, 92, 92, 0.15)',    text: '#5C5C5C', label: 'Charcoal' },
];

/**
 * Get the tag color entry for a given hex color.
 * Falls back to computing an rgba bg from the hex with 15% opacity.
 */
export function getTagColor(hex: string): { bg: string; text: string } {
  const match = TAG_PALETTE.find((p) => p.text.toLowerCase() === hex.toLowerCase());
  if (match) return { bg: match.bg, text: match.text };
  // Compute rgba from hex
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { bg: `rgba(${r}, ${g}, ${b}, 0.15)`, text: hex };
}
