import { useColorScheme } from 'react-native';
import { Theme } from '../types';
import { themes } from '../constants/themes';
import { useSettings } from './useSettings';

export function useTheme(): Theme {
  const settings = useSettings();
  const systemColorScheme = useColorScheme();
  
  // Get the user's selected theme mode, default to 'light' if not set
  const themeMode = settings.themeMode || 'light';
  
  // If user chose 'auto', follow system preference
  if (themeMode === 'auto') {
    return systemColorScheme === 'dark' ? themes.dark : themes.light;
  }
  
  // Otherwise return the selected theme
  return themes[themeMode];
}
