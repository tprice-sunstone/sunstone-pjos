// ============================================================================
// Sunstone OS — Theme Utilities
// ============================================================================
// Dynamic accent color generation and full theme application.
// Generates an 11-step color scale using HSL manipulation.
// The user's chosen color is preserved exactly as the 500 value
// and used as --accent-primary (button color, links, etc).
// Also supports applying a complete ThemeDefinition to CSS custom properties.

import type { ThemeDefinition } from './themes';

export interface AccentScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

/**
 * Validate a hex color string.
 */
export function isValidHexColor(hex: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
}

/**
 * Convert hex to HSL.
 */
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  let r = 0,
    g = 0,
    b = 0;

  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16) / 255;
    g = parseInt(clean[1] + clean[1], 16) / 255;
    b = parseInt(clean[2] + clean[2], 16) / 255;
  } else {
    r = parseInt(clean.substring(0, 2), 16) / 255;
    g = parseInt(clean.substring(2, 4), 16) / 255;
    b = parseInt(clean.substring(4, 6), 16) / 255;
  }

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Convert HSL to hex.
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate an 11-step accent color scale from a single hex value.
 * The input hex is preserved exactly as the 500 value.
 * Lighter and darker variants are generated relative to the
 * input color's actual lightness, not a fixed lightness.
 */
export function generateAccentScale(hex: string): AccentScale {
  if (!isValidHexColor(hex)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const { h, s, l } = hexToHSL(hex);

  // Build scale relative to the input color's actual lightness.
  // Steps lighter than 500 interpolate toward white (l=97).
  // Steps darker than 500 interpolate toward near-black (l=12).
  const lightCeil = 97;
  const darkFloor = 12;

  // How far from 500 each step is (0 = the picked color, 1 = extreme)
  const lighterSteps: Array<{ key: keyof AccentScale; t: number }> = [
    { key: 50,  t: 1.0 },
    { key: 100, t: 0.85 },
    { key: 200, t: 0.65 },
    { key: 300, t: 0.45 },
    { key: 400, t: 0.22 },
  ];

  const darkerSteps: Array<{ key: keyof AccentScale; t: number }> = [
    { key: 600, t: 0.22 },
    { key: 700, t: 0.40 },
    { key: 800, t: 0.55 },
    { key: 900, t: 0.70 },
    { key: 950, t: 0.90 },
  ];

  const scale = {} as AccentScale;

  // 500 = the exact input color
  scale[500] = hex;

  // Lighter steps: interpolate lightness from l → lightCeil, desaturate slightly
  for (const { key, t } of lighterSteps) {
    const stepL = l + (lightCeil - l) * t;
    const stepS = Math.max(s * (1 - t * 0.6), 8); // desaturate toward white
    scale[key] = hslToHex(h, stepS, stepL);
  }

  // Darker steps: interpolate lightness from l → darkFloor, maintain saturation
  for (const { key, t } of darkerSteps) {
    const stepL = l - (l - darkFloor) * t;
    const stepS = Math.min(s * (1 + t * 0.08), 100); // slightly boost saturation
    scale[key] = hslToHex(h, stepS, stepL);
  }

  return scale;
}

/**
 * Apply an accent color to the document root as CSS variables.
 * Call this client-side when a tenant's brand color is loaded.
 *
 * The picked hex is used as --accent-500 and --accent-primary,
 * so buttons and UI elements match the exact color chosen.
 */
export function applyAccentColor(hex: string): void {
  if (typeof document === 'undefined') return;
  if (!isValidHexColor(hex)) return;

  const scale = generateAccentScale(hex);
  const root = document.documentElement;

  for (const [key, value] of Object.entries(scale)) {
    root.style.setProperty(`--accent-${key}`, value);
  }

  // Semantic aliases — accent-primary = the exact color the user picked
  root.style.setProperty('--accent-primary', hex);
  root.style.setProperty('--accent-hover', scale[600]);
  root.style.setProperty('--accent-subtle', scale[50]);
  root.style.setProperty('--accent-muted', scale[100]);
}

// ============================================================================
// Full Theme Application
// ============================================================================

const THEME_FONT_LINK_ID = 'sunstone-theme-fonts';

/**
 * Load the theme's Google Fonts by injecting/updating a <link> tag.
 * Uses font-display: swap via the Google Fonts URL parameter.
 */
export function loadThemeFonts(fontImportUrl: string): void {
  if (typeof document === 'undefined') return;

  let link = document.getElementById(THEME_FONT_LINK_ID) as HTMLLinkElement | null;
  if (link) {
    // Update existing link if URL changed
    if (link.href !== fontImportUrl) {
      link.href = fontImportUrl;
    }
  } else {
    // Create new link element
    link = document.createElement('link');
    link.id = THEME_FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = fontImportUrl;
    document.head.appendChild(link);
  }
}

/**
 * Apply a complete theme definition to the document root.
 * Sets all CSS custom properties and loads the theme's fonts.
 * Themes are complete as-is — no accent overrides.
 */
export function applyTheme(theme: ThemeDefinition): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Generate full accent scale from the theme's accent color
  const scale = generateAccentScale(theme.accent);
  for (const [key, value] of Object.entries(scale)) {
    root.style.setProperty(`--accent-${key}`, value);
  }

  // Accent semantic aliases
  root.style.setProperty('--accent-primary', theme.accent);
  root.style.setProperty('--accent-hover', theme.accentHover);
  root.style.setProperty('--accent-subtle', scale[50]);
  root.style.setProperty('--accent-muted', scale[100]);

  // Surfaces
  root.style.setProperty('--surface-base', theme.background);
  root.style.setProperty('--surface-raised', theme.surfaceRaised);
  root.style.setProperty('--surface-overlay', theme.surfaceOverlay);
  root.style.setProperty('--surface-subtle', theme.surfaceSubtle);
  root.style.setProperty('--surface-sidebar', theme.surfaceSidebar);

  // Text
  root.style.setProperty('--text-primary', theme.textPrimary);
  root.style.setProperty('--text-secondary', theme.textSecondary);
  root.style.setProperty('--text-tertiary', theme.textTertiary);
  root.style.setProperty('--text-inverse', theme.mode === 'dark' ? theme.background : '#FFFFFF');
  root.style.setProperty('--text-on-accent', theme.textOnAccent);

  // Borders
  root.style.setProperty('--border-default', theme.borderDefault);
  root.style.setProperty('--border-subtle', theme.borderSubtle);
  root.style.setProperty('--border-strong', theme.borderStrong);

  // Nav state tokens (derived from accent)
  if (theme.mode === 'light') {
    root.style.setProperty('--nav-active-bg', theme.accentMuted);
    root.style.setProperty('--nav-active-text', scale[700]);
    root.style.setProperty('--nav-active-border', scale[600]);
  } else {
    root.style.setProperty('--nav-active-bg', theme.accentMuted);
    root.style.setProperty('--nav-active-text', theme.accent);
    root.style.setProperty('--nav-active-border', theme.accent);
  }

  // Typography
  const headingStack = `'${theme.headingFont}', Georgia, serif`;
  const bodyStack = `'${theme.bodyFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  root.style.setProperty('--font-heading', headingStack);
  root.style.setProperty('--font-body', bodyStack);
  root.style.setProperty('--font-sans', bodyStack);
  root.style.setProperty('--font-display', headingStack);

  // Theme-defined card radius and shadow
  root.style.setProperty('--card-radius', theme.cardRadius);
  root.style.setProperty('--shadow-card', theme.shadow);

  // Functional colors (theme-aware)
  root.style.setProperty('--color-success', theme.success);
  root.style.setProperty('--color-warning', theme.warning);
  root.style.setProperty('--color-danger', theme.danger);

  // Shadow adjustments for dark themes
  if (theme.mode === 'dark') {
    root.style.setProperty('--shadow-sm', '0 1px 3px 0 rgba(0, 0, 0, 0.25), 0 1px 2px -1px rgba(0, 0, 0, 0.25)');
    root.style.setProperty('--shadow-base', '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)');
    root.style.setProperty('--shadow-md', '0 10px 15px -3px rgba(0, 0, 0, 0.35), 0 4px 6px -4px rgba(0, 0, 0, 0.2)');
  } else {
    root.style.setProperty('--shadow-sm', '0 1px 3px 0 rgba(49, 36, 27, 0.06), 0 1px 2px -1px rgba(49, 36, 27, 0.06)');
    root.style.setProperty('--shadow-base', '0 4px 6px -1px rgba(49, 36, 27, 0.06), 0 2px 4px -2px rgba(49, 36, 27, 0.04)');
    root.style.setProperty('--shadow-md', '0 10px 15px -3px rgba(49, 36, 27, 0.08), 0 4px 6px -4px rgba(49, 36, 27, 0.04)');
  }

  // Load fonts
  loadThemeFonts(theme.fontImportUrl);
}