import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/theme';

export function useTheme() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  
  return {
    colors: Colors[theme],
    isDark: theme === 'dark',
  };
}
