'use client';

import { useEffect, type ReactNode } from 'react';
import { applyAccentColor, isValidHexColor } from '@/lib/theme';

interface ThemeProviderProps {
  accentColor?: string | null;
  children: ReactNode;
}

/**
 * ThemeProvider — Applies tenant accent color as CSS variables.
 *
 * If accentColor is a valid hex, it generates and applies a full
 * accent scale via CSS custom properties, overriding globals.css.
 *
 * If accentColor is null/undefined (no custom brand color saved),
 * it does nothing — the hand-tuned Sunstone palette in globals.css
 * remains active as the default.
 */
export function ThemeProvider({ accentColor, children }: ThemeProviderProps) {
  useEffect(() => {
    if (accentColor && isValidHexColor(accentColor)) {
      applyAccentColor(accentColor);
    }
    // If no accentColor, don't override — globals.css defaults apply
  }, [accentColor]);

  return <>{children}</>;
}