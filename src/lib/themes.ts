// ============================================================================
// Sunstone PJOS — Theme Definitions (Approved Collection)
// ============================================================================
// 9 preset themes (5 light, 4 dark). Each defines a complete visual identity:
// accent color, surface tones, text colors, borders, typography pairing,
// card radius, shadow style, and functional colors.
// ============================================================================

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  mode: 'light' | 'dark';
  // Accent
  accent: string;
  accentHover: string;
  accentMuted: string;
  // Surfaces
  background: string;
  surfaceDefault: string;
  surfaceRaised: string;
  surfaceOverlay: string;
  surfaceSubtle: string;
  surfaceSidebar: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textOnAccent: string;
  // Borders
  borderDefault: string;
  borderSubtle: string;
  borderStrong: string;
  // Typography
  headingFont: string;
  bodyFont: string;
  fontImportUrl: string;
  // Shape & Elevation
  cardRadius: string;
  shadow: string;
  // Functional Colors
  success: string;
  warning: string;
  danger: string;
}

// ============================================================================
// Light Themes
// ============================================================================

const roseGold: ThemeDefinition = {
  id: 'rose-gold',
  name: 'Rose Gold & Ivory',
  description: 'Warm, Sunstone-aligned, feminine luxury',
  mode: 'light',
  accent: '#B76E79',
  accentHover: '#A45D68',
  accentMuted: '#F8EDEE',
  background: '#FFFBF7',
  surfaceDefault: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceOverlay: '#FFFBF7F5',
  surfaceSubtle: '#FBF3EE',
  surfaceSidebar: '#F6ECE6',
  textPrimary: '#3D2C2E',
  textSecondary: '#8B6F72',
  textTertiary: '#BFA0A3',
  textOnAccent: '#FFFFFF',
  borderDefault: '#EBD9D5',
  borderSubtle: '#F5EAE7',
  borderStrong: '#DBC5C0',
  headingFont: 'Playfair Display',
  bodyFont: 'DM Sans',
  fontImportUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap',
  cardRadius: '16px',
  shadow: '0 1px 3px 0 rgba(183, 110, 121, 0.06), 0 1px 2px -1px rgba(183, 110, 121, 0.06)',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

const softBlush: ThemeDefinition = {
  id: 'soft-blush',
  name: 'Soft Blush & Cloud',
  description: 'Flodesk-inspired, ultra-clean, airy',
  mode: 'light',
  accent: '#D4847C',
  accentHover: '#BF726A',
  accentMuted: '#FBF0EE',
  background: '#FEFCFB',
  surfaceDefault: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceOverlay: '#FEFCFBF5',
  surfaceSubtle: '#F9F5F4',
  surfaceSidebar: '#F4EDEB',
  textPrimary: '#3A2F30',
  textSecondary: '#8A7273',
  textTertiary: '#BCA6A7',
  textOnAccent: '#FFFFFF',
  borderDefault: '#EDE0DD',
  borderSubtle: '#F6EEEC',
  borderStrong: '#DFD0CC',
  headingFont: 'Libre Baskerville',
  bodyFont: 'Karla',
  fontImportUrl: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Karla:wght@400;500;600;700&display=swap',
  cardRadius: '20px',
  shadow: '0 1px 3px 0 rgba(212, 132, 124, 0.06), 0 1px 2px -1px rgba(212, 132, 124, 0.06)',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

const warmSlate: ThemeDefinition = {
  id: 'warm-slate',
  name: 'Warm Slate & Bronze',
  description: 'Modern neutral, sophisticated restraint',
  mode: 'light',
  accent: '#9A7B5B',
  accentHover: '#866A4D',
  accentMuted: '#F2EDE6',
  background: '#F5F3F0',
  surfaceDefault: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceOverlay: '#F5F3F0F5',
  surfaceSubtle: '#EDEBE8',
  surfaceSidebar: '#E7E4DF',
  textPrimary: '#2D2A26',
  textSecondary: '#706A62',
  textTertiary: '#A19B93',
  textOnAccent: '#FFFFFF',
  borderDefault: '#DDD9D3',
  borderSubtle: '#EAE7E3',
  borderStrong: '#CEC9C1',
  headingFont: 'Source Serif 4',
  bodyFont: 'Plus Jakarta Sans',
  fontImportUrl: 'https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
  cardRadius: '10px',
  shadow: '0 1px 3px 0 rgba(154, 123, 91, 0.06), 0 1px 2px -1px rgba(154, 123, 91, 0.06)',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

const sageLinen: ThemeDefinition = {
  id: 'sage-linen',
  name: 'Sage & Linen',
  description: 'Soft botanical, wellness-inspired',
  mode: 'light',
  accent: '#6B8068',
  accentHover: '#5A6E58',
  accentMuted: '#ECF0EB',
  background: '#F7F5F0',
  surfaceDefault: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceOverlay: '#F7F5F0F5',
  surfaceSubtle: '#EEF0EB',
  surfaceSidebar: '#E5EAE3',
  textPrimary: '#2A3028',
  textSecondary: '#5F6E5C',
  textTertiary: '#95A392',
  textOnAccent: '#FFFFFF',
  borderDefault: '#D5DDD2',
  borderSubtle: '#E5ECE3',
  borderStrong: '#C2CCC0',
  headingFont: 'Libre Baskerville',
  bodyFont: 'Karla',
  fontImportUrl: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Karla:wght@400;500;600;700&display=swap',
  cardRadius: '14px',
  shadow: '0 1px 3px 0 rgba(107, 128, 104, 0.06), 0 1px 2px -1px rgba(107, 128, 104, 0.06)',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

const frenchBlue: ThemeDefinition = {
  id: 'french-blue',
  name: 'French Blue & Ivory',
  description: 'Classic, soft, Parisian boutique',
  mode: 'light',
  accent: '#6E85A3',
  accentHover: '#5C7390',
  accentMuted: '#ECF0F6',
  background: '#FAFBFD',
  surfaceDefault: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceOverlay: '#FAFBFDF5',
  surfaceSubtle: '#F0F2F6',
  surfaceSidebar: '#E6EAF0',
  textPrimary: '#2A3040',
  textSecondary: '#5E6B80',
  textTertiary: '#95A0B2',
  textOnAccent: '#FFFFFF',
  borderDefault: '#D5DCE6',
  borderSubtle: '#E6EBF2',
  borderStrong: '#C0CAD8',
  headingFont: 'Playfair Display',
  bodyFont: 'DM Sans',
  fontImportUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap',
  cardRadius: '16px',
  shadow: '0 1px 3px 0 rgba(110, 133, 163, 0.06), 0 1px 2px -1px rgba(110, 133, 163, 0.06)',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

// ============================================================================
// Dark Themes
// ============================================================================

const midnightGold: ThemeDefinition = {
  id: 'midnight-gold',
  name: 'Midnight & Gold',
  description: 'Rich dark mode, warm gold accents',
  mode: 'dark',
  accent: '#D4A853',
  accentHover: '#E0B866',
  accentMuted: '#1A1810',
  background: '#0F1419',
  surfaceDefault: '#161C23',
  surfaceRaised: '#1C2430',
  surfaceOverlay: '#1C2430F0',
  surfaceSubtle: '#121820',
  surfaceSidebar: '#0B1015',
  textPrimary: '#F0EDE6',
  textSecondary: '#9DA4AD',
  textTertiary: '#5C6370',
  textOnAccent: '#0F1419',
  borderDefault: '#2A3342',
  borderSubtle: '#1E2738',
  borderStrong: '#374760',
  headingFont: 'Cormorant Garamond',
  bodyFont: 'Outfit',
  fontImportUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap',
  cardRadius: '12px',
  shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
};

const deepPlum: ThemeDefinition = {
  id: 'deep-plum',
  name: 'Deep Plum & Champagne',
  description: 'Bold jewel-tone, editorial luxury',
  mode: 'dark',
  accent: '#C9A96E',
  accentHover: '#D9BC84',
  accentMuted: '#1E1618',
  background: '#1A1020',
  surfaceDefault: '#221628',
  surfaceRaised: '#2A1E32',
  surfaceOverlay: '#2A1E32F0',
  surfaceSubtle: '#1E1224',
  surfaceSidebar: '#150D1B',
  textPrimary: '#F0E8F0',
  textSecondary: '#A898B0',
  textTertiary: '#6E5E7A',
  textOnAccent: '#1A1020',
  borderDefault: '#362840',
  borderSubtle: '#2A1E33',
  borderStrong: '#483852',
  headingFont: 'Bodoni Moda',
  bodyFont: 'Manrope',
  fontImportUrl: 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap',
  cardRadius: '14px',
  shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.35), 0 1px 2px -1px rgba(0, 0, 0, 0.35)',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
};

const forestGold: ThemeDefinition = {
  id: 'forest-gold',
  name: 'Forest & Gold',
  description: 'Botanical luxury, spa energy',
  mode: 'dark',
  accent: '#C5A55A',
  accentHover: '#D5B86E',
  accentMuted: '#15180F',
  background: '#0D1A14',
  surfaceDefault: '#14221B',
  surfaceRaised: '#1A2A22',
  surfaceOverlay: '#1A2A22F0',
  surfaceSubtle: '#101E18',
  surfaceSidebar: '#091510',
  textPrimary: '#E8F0EA',
  textSecondary: '#8FA89A',
  textTertiary: '#546B5E',
  textOnAccent: '#0D1A14',
  borderDefault: '#243830',
  borderSubtle: '#1C2E26',
  borderStrong: '#305040',
  headingFont: 'Cormorant Garamond',
  bodyFont: 'Outfit',
  fontImportUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap',
  cardRadius: '12px',
  shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
};

const deepOcean: ThemeDefinition = {
  id: 'deep-ocean',
  name: 'Deep Ocean & Pearl',
  description: 'Moody navy, silver-pearl accents',
  mode: 'dark',
  accent: '#B8C4D4',
  accentHover: '#CDD6E2',
  accentMuted: '#10131A',
  background: '#0A0E18',
  surfaceDefault: '#111620',
  surfaceRaised: '#171E2A',
  surfaceOverlay: '#171E2AF0',
  surfaceSubtle: '#0E131C',
  surfaceSidebar: '#070B12',
  textPrimary: '#E4E9F0',
  textSecondary: '#8D97A8',
  textTertiary: '#4E5A6C',
  textOnAccent: '#0A0E18',
  borderDefault: '#232E3E',
  borderSubtle: '#1A2434',
  borderStrong: '#30405A',
  headingFont: 'Bodoni Moda',
  bodyFont: 'Manrope',
  fontImportUrl: 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap',
  cardRadius: '12px',
  shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.35), 0 1px 2px -1px rgba(0, 0, 0, 0.35)',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
};

// ============================================================================
// Registry
// ============================================================================

export const THEMES: ThemeDefinition[] = [
  roseGold,
  softBlush,
  warmSlate,
  sageLinen,
  frenchBlue,
  midnightGold,
  deepPlum,
  forestGold,
  deepOcean,
];

export const LIGHT_THEMES = THEMES.filter((t) => t.mode === 'light');
export const DARK_THEMES = THEMES.filter((t) => t.mode === 'dark');

export const DEFAULT_THEME_ID = 'rose-gold';

export function getThemeById(id: string): ThemeDefinition {
  return THEMES.find((t) => t.id === id) || roseGold;
}
