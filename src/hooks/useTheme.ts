import { Theme } from '../types';
import { themes } from '../constants/themes';
import { useSettings } from './useSettings';

export function useTheme(): Theme {
  const settings = useSettings();
  const themeMode = settings.themeMode || 'light';
  return themes[themeMode] ?? themes.light;
}
