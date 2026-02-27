// ============================================================================
// Sunstone PJOS — Theme Definitions
// ============================================================================
// 9 preset themes (5 light, 4 dark). Each defines a complete visual identity:
// accent color, surface tones, text colors, borders, and typography pairing.
// ============================================================================

export interface ThemeDefinition {
  id: string;
  name: string;
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
}

// ============================================================================
// Light Themes
// ============================================================================

const roseGold: ThemeDefinition = {
  id: 'rose-gold',
  name: 'Rose Gold',
  mode: 'light',
  accent: '#B76E79',
  accentHover: '#A45E69',
  accentMuted: '#F8EDEE',
  background: '#FFFBF7',
  surfaceDefault: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceOverlay: '#FFFFFF',
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
};

const champagneToast: ThemeDefinition = {
  id: 'champagne-toast',
  name: 'Champagne Toast',
  mode: 'light',
  accent: '#C9A96E',
  accentHover: '#B8975C',
  accentMuted: '#FBF5E8',
  background: '#FFFDF5',
  surfaceDefault: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceOverlay: '#FFFFFF',
  surfaceSubtle: '#F9F3E6',
  surfaceSidebar: '#F3ECD8',
  textPrimary: '#3A3225',
  textSecondary: '#887A5E',
  textTertiary: '#BDB094',
  textOnAccent: '#3A3225',
  borderDefault: '#EAE0CC',
  borderSubtle: '#F3EDE0',
  borderStrong: '#DDD0B8',
  headingFont: 'Cormorant Garamond',
  bodyFont: 'Inter',
  fontImportUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap',
};

const studioBlush: ThemeDefinition = {
  id: 'studio-blush',
  name: 'Studio Blush',
  mode: 'light',
  accent: '#D4A0A7',
  accentHover: '#C48D95',
  accentMuted: '#FBF0F1',
  background: '#FFF8F6',
  surfaceDefault: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceOverlay: '#FFFFFF',
  surfaceSubtle: '#F9F0EE',
  surfaceSidebar: '#F3E8E5',
  textPrimary: '#3D2F31',
  textSecondary: '#8B7073',
  textTertiary: '#BFA2A5',
  textOnAccent: '#3D2F31',
  borderDefault: '#ECDAD7',
  borderSubtle: '#F5ECEA',
  borderStrong: '#DEC7C3',
  headingFont: 'Lora',
  bodyFont: 'Nunito Sans',
  fontImportUrl: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Nunito+Sans:wght@400;500;600;700&display=swap',
};

const coastalSage: ThemeDefinition = {
  id: 'coastal-sage',
  name: 'Coastal Sage',
  mode: 'light',
  accent: '#8FA89A',
  accentHover: '#7D978A',
  accentMuted: '#EDF4EF',
  background: '#F7FAF8',
  surfaceDefault: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceOverlay: '#FFFFFF',
  surfaceSubtle: '#EFF4F1',
  surfaceSidebar: '#E7EEE9',
  textPrimary: '#2A3530',
  textSecondary: '#607A6D',
  textTertiary: '#97ADA1',
  textOnAccent: '#FFFFFF',
  borderDefault: '#D5E0D9',
  borderSubtle: '#E4EDE7',
  borderStrong: '#C2D0C8',
  headingFont: 'Libre Baskerville',
  bodyFont: 'Source Sans 3',
  fontImportUrl: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;500;600;700&display=swap',
};

const pearlWhite: ThemeDefinition = {
  id: 'pearl-white',
  name: 'Pearl White',
  mode: 'light',
  accent: '#9A8C98',
  accentHover: '#877987',
  accentMuted: '#F2EFF2',
  background: '#FFFFFF',
  surfaceDefault: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceOverlay: '#FFFFFF',
  surfaceSubtle: '#F5F3F5',
  surfaceSidebar: '#EDEBEE',
  textPrimary: '#2D2933',
  textSecondary: '#6E6577',
  textTertiary: '#A599A8',
  textOnAccent: '#FFFFFF',
  borderDefault: '#DDD8DF',
  borderSubtle: '#EBE8EC',
  borderStrong: '#CEC7D1',
  headingFont: 'Spectral',
  bodyFont: 'Karla',
  fontImportUrl: 'https://fonts.googleapis.com/css2?family=Spectral:wght@400;500;600;700&family=Karla:wght@400;500;600;700&display=swap',
};

// ============================================================================
// Dark Themes
// ============================================================================

const midnightLuxe: ThemeDefinition = {
  id: 'midnight-luxe',
  name: 'Midnight Luxe',
  mode: 'dark',
  accent: '#D4AF37',
  accentHover: '#E2BF4F',
  accentMuted: '#1B1A13',
  background: '#0D1117',
  surfaceDefault: '#161B22',
  surfaceRaised: '#1C2333',
  surfaceOverlay: '#22293A',
  surfaceSubtle: '#12171E',
  surfaceSidebar: '#0A0E14',
  textPrimary: '#F0F6FC',
  textSecondary: '#9DAAB9',
  textTertiary: '#5C6B7A',
  textOnAccent: '#0D1117',
  borderDefault: '#2A3444',
  borderSubtle: '#1E2738',
  borderStrong: '#374760',
  headingFont: 'Cinzel',
  bodyFont: 'Outfit',
  fontImportUrl: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap',
};

const velvetNoir: ThemeDefinition = {
  id: 'velvet-noir',
  name: 'Velvet Noir',
  mode: 'dark',
  accent: '#E8B4B8',
  accentHover: '#F0C5C9',
  accentMuted: '#221A1D',
  background: '#1A1218',
  surfaceDefault: '#231A20',
  surfaceRaised: '#2C222A',
  surfaceOverlay: '#352A33',
  surfaceSubtle: '#1E161C',
  surfaceSidebar: '#150D13',
  textPrimary: '#F5ECF0',
  textSecondary: '#B39EA8',
  textTertiary: '#735F6A',
  textOnAccent: '#1A1218',
  borderDefault: '#3D2F38',
  borderSubtle: '#2E2229',
  borderStrong: '#523E4C',
  headingFont: 'Italiana',
  bodyFont: 'Raleway',
  fontImportUrl: 'https://fonts.googleapis.com/css2?family=Italiana&family=Raleway:wght@400;500;600;700&display=swap',
};

const emberGlow: ThemeDefinition = {
  id: 'ember-glow',
  name: 'Ember Glow',
  mode: 'dark',
  accent: '#E8916D',
  accentHover: '#F0A283',
  accentMuted: '#221815',
  background: '#1C1412',
  surfaceDefault: '#251C19',
  surfaceRaised: '#2F2522',
  surfaceOverlay: '#392E2A',
  surfaceSubtle: '#1F1714',
  surfaceSidebar: '#170F0D',
  textPrimary: '#F5EDE8',
  textSecondary: '#B59E94',
  textTertiary: '#7B655A',
  textOnAccent: '#1C1412',
  borderDefault: '#3F312A',
  borderSubtle: '#2F2320',
  borderStrong: '#564539',
  headingFont: 'Bodoni Moda',
  bodyFont: 'DM Sans',
  fontImportUrl: 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap',
};

const onyx: ThemeDefinition = {
  id: 'onyx',
  name: 'Onyx',
  mode: 'dark',
  accent: '#C8C8C8',
  accentHover: '#DCDCDC',
  accentMuted: '#1C1C1C',
  background: '#111111',
  surfaceDefault: '#1A1A1A',
  surfaceRaised: '#222222',
  surfaceOverlay: '#2A2A2A',
  surfaceSubtle: '#161616',
  surfaceSidebar: '#0C0C0C',
  textPrimary: '#EEEEEE',
  textSecondary: '#999999',
  textTertiary: '#5C5C5C',
  textOnAccent: '#111111',
  borderDefault: '#333333',
  borderSubtle: '#252525',
  borderStrong: '#444444',
  headingFont: 'Space Grotesk',
  bodyFont: 'Inter',
  fontImportUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap',
};

// ============================================================================
// Registry
// ============================================================================

export const THEMES: ThemeDefinition[] = [
  roseGold,
  champagneToast,
  studioBlush,
  coastalSage,
  pearlWhite,
  midnightLuxe,
  velvetNoir,
  emberGlow,
  onyx,
];

export const LIGHT_THEMES = THEMES.filter((t) => t.mode === 'light');
export const DARK_THEMES = THEMES.filter((t) => t.mode === 'dark');

export const DEFAULT_THEME_ID = 'rose-gold';

export function getThemeById(id: string): ThemeDefinition {
  return THEMES.find((t) => t.id === id) || roseGold;
}
