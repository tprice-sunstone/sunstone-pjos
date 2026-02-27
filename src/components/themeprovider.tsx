'use client';

import { useEffect, type ReactNode } from 'react';
import { applyTheme } from '@/lib/theme';
import { getThemeById, DEFAULT_THEME_ID } from '@/lib/themes';

interface ThemeProviderProps {
  themeId?: string | null;
  children: ReactNode;
}

/**
 * ThemeProvider — Applies a full theme (colors, surfaces, borders, fonts)
 * via CSS custom properties. Themes are complete as-is — no overrides.
 *
 * - If themeId is set, applies the matching theme from the registry.
 * - If not set, Rose Gold defaults from globals.css remain active.
 */
export function ThemeProvider({ themeId, children }: ThemeProviderProps) {
  useEffect(() => {
    const theme = getThemeById(themeId || DEFAULT_THEME_ID);
    applyTheme(theme);
  }, [themeId]);

  return <>{children}</>;
}
