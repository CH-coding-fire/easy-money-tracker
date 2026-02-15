import { Theme, ThemeMode } from '../types';

// ── Light Theme (Current Style) ────────────────────────────────────────────
export const lightTheme: Theme = {
  background: '#F5F5F5',
  cardBackground: '#FFFFFF',
  text: {
    primary: '#222222',
    secondary: '#555555',
    tertiary: '#999999',
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
    primary: '#F0F0F0',
    secondary: '#B0B0B0',
    tertiary: '#808080',
  },
  primary: '#64B5F6',
  success: '#81C784',
  error: '#EF5350',
  warning: '#FFB74D',
  border: '#2C2C2C',
  divider: '#2C2C2C',
  chartColors: [
    '#64B5F6', '#81C784', '#FFB74D', '#BA68C8', '#EF5350',
    '#4DD0E1', '#A1887F', '#90A4AE', '#F06292', '#7986CB',
    '#4DB6AC', '#FF8A65', '#DCE775', '#FFD54F', '#AED581',
    '#9575CD', '#4FC3F7', '#FFF176', '#FF9E40', '#66BB6A',
  ],
  shadow: 'rgba(0, 0, 0, 0.5)',
  overlay: 'rgba(0, 0, 0, 0.7)',
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
  success: '#6EE7B7',
  error: '#FCA5A5',
  warning: '#FCD34D',
  border: '#F3E8FF',
  divider: '#F3E8FF',
  chartColors: [
    '#A78BFA', '#6EE7B7', '#FCD34D', '#F9A8D4', '#FCA5A5',
    '#93C5FD', '#C4B5FD', '#FDE68A', '#FBCFE8', '#FECACA',
    '#BAE6FD', '#DDD6FE', '#FEF3C7', '#F9A8D4', '#FED7AA',
    '#C7D2FE', '#99F6E4', '#FDE047', '#FDA4AF', '#D8B4FE',
  ],
  shadow: 'rgba(167, 139, 250, 0.1)',
  overlay: 'rgba(167, 139, 250, 0.3)',
};

// ── Theme Registry ─────────────────────────────────────────────────────────
export const themes: Record<ThemeMode, Theme> = {
  light: lightTheme,
  dark: darkTheme,
  pastel: pastelTheme,
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
    description: 'Dark backgrounds, easy on the eyes',
    icon: 'moon',
  },
  {
    mode: 'pastel',
    label: 'Pastel',
    description: 'Soft, gentle colors for a calm experience',
    icon: 'color-palette',
  },
];
