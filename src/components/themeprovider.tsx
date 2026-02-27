'use client';

import { useEffect, type ReactNode } from 'react';
import { applyTheme, applyAccentColor, isValidHexColor } from '@/lib/theme';
import { getThemeById, DEFAULT_THEME_ID } from '@/lib/themes';

interface ThemeProviderProps {
  themeId?: string | null;
  accentColor?: string | null;
  children: ReactNode;
}

/**
 * ThemeProvider — Applies a full theme (colors, surfaces, borders, fonts)
 * via CSS custom properties.
 *
 * - If themeId is set, applies the matching theme from the registry.
 * - If accentColor is also set, it overrides the theme's accent color.
 * - If neither is set, Rose Gold defaults from globals.css remain active.
 */
export function ThemeProvider({ themeId, accentColor, children }: ThemeProviderProps) {
  useEffect(() => {
    const theme = getThemeById(themeId || DEFAULT_THEME_ID);
    const hasCustomAccent = accentColor && isValidHexColor(accentColor);
    applyTheme(theme, hasCustomAccent ? accentColor : null);
  }, [themeId, accentColor]);

  return <>{children}</>;
}
