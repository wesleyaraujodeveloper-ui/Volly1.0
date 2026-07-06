import { StyleSheet } from 'react-native';

export type ThemeColors = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  background: string;
  surface: string;
  surfaceHighlight: string;
  text: string;
  textSecondary: string;
  error: string;
  success: string;
  accent: string;
  accentDark: string;
  warning: string;
  border: string;
};

export const darkColors: ThemeColors = {
  primary: '#DF721B', // Novo Laranja vibrante - Identidade Volly
  primaryDark: '#BB5013',
  primaryLight: '#F28B3C',
  background: '#121212', // Cinza Chumbo - Moderno e elegante
  surface: '#1A1A1A',   // Fundo de cards e modais
  surfaceHighlight: '#242424',
  text: '#FFFFFF', // Texto claro
  textSecondary: '#A0A0A0', // Texto secundário acinzentado
  error: '#FF5252',
  success: '#6BC5A7', // Verde menta sugerido
  accent: '#6BC5A7', // Menta como cor de destaque
  accentDark: '#4A9E82',
  warning: '#FFC107', // Amarelo
  border: '#333333',
};

export const lightColors: ThemeColors = {
  primary: '#DF721B',
  primaryDark: '#BB5013',
  primaryLight: '#F28B3C',
  background: '#F5F6F8', // Cinza muito claro e moderno
  surface: '#FFFFFF',   // Branco para cards
  surfaceHighlight: '#EFEFEF',
  text: '#121212', // Texto quase preto
  textSecondary: '#666666', // Texto secundário escuro
  error: '#E53935',
  success: '#2E7D32', 
  accent: '#3B9B7B', // Menta mais escuro para garantir contraste
  accentDark: '#2C7A5F',
  warning: '#F57C00',
  border: '#E0E0E0',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  pill: 9999,
};

export type Theme = {
  colors: ThemeColors;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
};

// Retro-compatibilidade (Temporário enquanto migramos as telas)
export const theme: Theme = {
  colors: darkColors,
  spacing,
  borderRadius,
};

// Utilidades base convertidas para aceitar o tema dinâmico
export const getGlobalStyles = (currentTheme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: currentTheme.colors.background,
    padding: currentTheme.spacing.md,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: currentTheme.colors.text,
    marginBottom: currentTheme.spacing.sm,
  },
  textBody: {
    fontSize: 16,
    color: currentTheme.colors.textSecondary,
    lineHeight: 24,
  },
});

// Retro-compatibilidade (Temporário)
export const globalStyles = getGlobalStyles(theme);
