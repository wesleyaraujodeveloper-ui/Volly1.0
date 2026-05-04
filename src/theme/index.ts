import { StyleSheet } from 'react-native';

export const theme = {
  colors: {
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
    border: '#333333',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    xl: 24,
    pill: 9999,
  },
};

// Utilidades base
export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  textBody: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
});
