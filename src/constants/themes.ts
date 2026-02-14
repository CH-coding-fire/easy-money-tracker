import { Theme, ThemeMode } from '../types';

// ── Light Theme (Current Style) ────────────────────────────────────────────
export const lightTheme: Theme = {
  background: '#F5F5F5',
  cardBackground: '#FFFFFF',
  text: {
    primary: '#222',
    secondary: '#555',
    tertiary: '#999',
  },
  primary: '#2196F3',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  border: '#E0E0E0',
  divider: '#E0E0E0',
  chartColors: [
    '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336',
    '#00BCD4', '#795548', '#607D8B', '#E91E63', '#3F51B5',
    '#009688', '#FF5722', '#CDDC39', '#FFC107', '#8BC34A',
    '#673AB7', '#03A9F4', '#FFEB3B', '#FF6F00', '#1B5E20',
  ],
  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

// ── Dark Theme ─────────────────────────────────────────────────────────────
export const darkTheme: Theme = {
  background: '#121212',
  cardBackground: '#1E1E1E',
  text: {
    primary: '#FFFFFF',
    secondary: '#B3B3B3',
    tertiary: '#666666',
  },
  primary: '#64B5F6',
  success: '#81C784',
  error: '#E57373',
  warning: '#FFB74D',
  border: '#333333',
  divider: '#333333',
  chartColors: [
    '#64B5F6', '#81C784', '#FFB74D', '#BA68C8', '#E57373',
    '#4DD0E1', '#A1887F', '#90A4AE', '#F06292', '#7986CB',
    '#4DB6AC', '#FF8A65', '#DCE775', '#FFD54F', '#AED581',
    '#9575CD', '#4FC3F7', '#FFF176', '#FF9E40', '#66BB6A',
  ],
  shadow: 'rgba(0, 0, 0, 0.5)',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

// ── Amoled/True Black Theme ────────────────────────────────────────────────
export const amoledTheme: Theme = {
  background: '#000000',
  cardBackground: '#0A0A0A',
  text: {
    primary: '#FFFFFF',
    secondary: '#AAAAAA',
    tertiary: '#666666',
  },
  primary: '#64B5F6',
  success: '#81C784',
  error: '#E57373',
  warning: '#FFB74D',
  border: '#1A1A1A',
  divider: '#1A1A1A',
  chartColors: [
    '#64B5F6', '#81C784', '#FFB74D', '#BA68C8', '#E57373',
    '#4DD0E1', '#A1887F', '#90A4AE', '#F06292', '#7986CB',
    '#4DB6AC', '#FF8A65', '#DCE775', '#FFD54F', '#AED581',
    '#9575CD', '#4FC3F7', '#FFF176', '#FF9E40', '#66BB6A',
  ],
  shadow: 'rgba(0, 0, 0, 0.8)',
  overlay: 'rgba(0, 0, 0, 0.9)',
};

// ── High Contrast Theme ────────────────────────────────────────────────────
export const highContrastTheme: Theme = {
  background: '#FFFFFF',
  cardBackground: '#FFFFFF',
  text: {
    primary: '#000000',
    secondary: '#000000',
    tertiary: '#333333',
  },
  primary: '#0000FF',
  success: '#008000',
  error: '#FF0000',
  warning: '#FF8C00',
  border: '#000000',
  divider: '#000000',
  chartColors: [
    '#0000FF', '#008000', '#FF8C00', '#800080', '#FF0000',
    '#00CED1', '#8B4513', '#708090', '#C71585', '#4B0082',
    '#008B8B', '#FF4500', '#9ACD32', '#FFD700', '#32CD32',
    '#9400D3', '#1E90FF', '#FFFF00', '#FF6347', '#228B22',
  ],
  shadow: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(0, 0, 0, 0.8)',
};

// ── Pastel/Soft Theme ──────────────────────────────────────────────────────
export const pastelTheme: Theme = {
  background: '#FFF5F7',
  cardBackground: '#FFFFFF',
  text: {
    primary: '#4A4A4A',
    secondary: '#6B6B6B',
    tertiary: '#999999',
  },
  primary: '#A78BFA',
  success: '#86EFAC',
  error: '#FCA5A5',
  warning: '#FCD34D',
  border: '#F3E8FF',
  divider: '#F3E8FF',
  chartColors: [
    '#A78BFA', '#86EFAC', '#FCD34D', '#F9A8D4', '#FCA5A5',
    '#93C5FD', '#C4B5FD', '#FDE68A', '#FBCFE8', '#FECACA',
    '#BAE6FD', '#DDD6FE', '#FEF3C7', '#F9A8D4', '#FED7AA',
    '#C7D2FE', '#99F6E4', '#FDE047', '#FDA4AF', '#D8B4FE',
  ],
  shadow: 'rgba(167, 139, 250, 0.1)',
  overlay: 'rgba(167, 139, 250, 0.3)',
};

// ── Finance/Money Theme ────────────────────────────────────────────────────
export const financeTheme: Theme = {
  background: '#0F1419',
  cardBackground: '#1C2128',
  text: {
    primary: '#E6EDF3',
    secondary: '#8B949E',
    tertiary: '#6E7681',
  },
  primary: '#FFD700',
  success: '#2EA043',
  error: '#DA3633',
  warning: '#D29922',
  border: '#30363D',
  divider: '#30363D',
  chartColors: [
    '#FFD700', '#2EA043', '#58A6FF', '#BC8CFF', '#F85149',
    '#56D364', '#FFA657', '#8B949E', '#F778BA', '#79C0FF',
    '#3FB950', '#D29922', '#A371F7', '#FF7B72', '#FFA198',
    '#7EE787', '#E3B341', '#D2A8FF', '#FF9492', '#6CB6FF',
  ],
  shadow: 'rgba(0, 0, 0, 0.4)',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

// ── Theme Registry ─────────────────────────────────────────────────────────
export const themes: Record<ThemeMode, Theme> = {
  light: lightTheme,
  dark: darkTheme,
  amoled: amoledTheme,
  high_contrast: highContrastTheme,
  pastel: pastelTheme,
  finance: financeTheme,
  auto: lightTheme, // Will be determined dynamically by useTheme hook
};

// ── Theme Metadata ─────────────────────────────────────────────────────────
export interface ThemeOption {
  mode: ThemeMode;
  label: string;
  description: string;
  icon: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    mode: 'light',
    label: 'Light',
    description: 'Classic light mode with white backgrounds',
    icon: 'sunny',
  },
  {
    mode: 'dark',
    label: 'Dark',
    description: 'Dark grey backgrounds, easy on the eyes',
    icon: 'moon',
  },
  {
    mode: 'amoled',
    label: 'Amoled',
    description: 'True black for OLED screens, battery-saving',
    icon: 'contrast',
  },
  {
    mode: 'high_contrast',
    label: 'High Contrast',
    description: 'Maximum contrast for better accessibility',
    icon: 'accessibility',
  },
  {
    mode: 'pastel',
    label: 'Pastel',
    description: 'Soft, gentle colors for a calm experience',
    icon: 'color-palette',
  },
  {
    mode: 'finance',
    label: 'Finance',
    description: 'Professional gold and green money theme',
    icon: 'cash',
  },
  {
    mode: 'auto',
    label: 'Auto',
    description: 'Automatically follow system theme',
    icon: 'phone-portrait',
  },
];
