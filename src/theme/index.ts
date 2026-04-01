import { StyleSheet } from 'react-native';

export const theme = {
  colors: {
    primary: '#FF6A00', // Laranja vibrante - Identidade Volly
    primaryDark: '#CC5500',
    primaryLight: '#FF8A33',
    background: '#121212', // Fundo principal escuro
    surface: '#1E1E1E',   // Fundo de cards e modais
    surfaceHighlight: '#2A2A2A',
    text: '#FFFFFF', // Texto claro
    textSecondary: '#A0A0A0', // Texto secundário acinzentado
    error: '#CF6679',
    success: '#03DAC6',
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
