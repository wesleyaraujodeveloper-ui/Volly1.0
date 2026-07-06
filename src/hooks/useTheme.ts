import { useColorScheme } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { darkColors, lightColors, spacing, borderRadius, Theme, getGlobalStyles } from '../theme';
import { useMemo } from 'react';

export function useTheme() {
  const themeMode = useAppStore(state => state.themeMode);
  const systemColorScheme = useColorScheme();

  const isDarkMode = 
    themeMode === 'dark' || 
    (themeMode === 'system' && systemColorScheme === 'dark');

  const theme: Theme = useMemo(() => ({
    colors: isDarkMode ? darkColors : lightColors,
    spacing,
    borderRadius,
  }), [isDarkMode]);

  const globalStyles = useMemo(() => getGlobalStyles(theme), [theme]);

  return {
    theme,
    isDarkMode,
    globalStyles,
  };
}
