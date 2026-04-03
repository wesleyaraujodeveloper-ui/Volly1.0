import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { globalStyles, theme } from '../../src/theme';
import { useAppStore } from '../../src/store/useAppStore';
import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../../src/services/supabase';
import { Ionicons } from '@expo/vector-icons';

// Inicia o browser para os provedores de Auth
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setIsAuthenticating(true);
      console.log('--- INICIANDO OAUTH ---');
      
      const redirectTo = AuthSession.makeRedirectUri({
        scheme: 'vollyapp',
        path: '(auth)/auth-callback',
      });
      
      console.log('DEBUG: URL de Redirecionamento gerada:', redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });

      if (error) throw error;
      
      if (data?.url) {
        console.log('OAuth URL:', data.url);
        
        if (Platform.OS === 'web') {
           console.log('Plataforma WEB detectada: Redirecionando...');
           window.location.assign(data.url);
        } else {
           console.log('Plataforma MOBILE detectada: Abrindo WebBrowser...');
           const result = await WebBrowser.openAuthSessionAsync(
             data.url, 
             redirectTo
           );

           if (result.type === 'success' && result.url) {
             console.log('DEBUG: OAuth Mobile Success! Parsing URL...');
             
             const fragment = result.url.split('#')[1];
             if (fragment) {
               const params = new URLSearchParams(fragment);
               const accessToken = params.get('access_token');
               const refreshToken = params.get('refresh_token');

               if (accessToken && refreshToken) {
                 console.log('DEBUG: Tokens encontrados! Definindo sessão...');
                 const { error: sessionError } = await supabase.auth.setSession({
                   access_token: accessToken,
                   refresh_token: refreshToken,
                 });
                 
                 if (sessionError) throw sessionError;
               }
             }
           } else if (result.type !== 'success') {
             setIsAuthenticating(false);
           }
        }
      }

    } catch (error) {
      console.error('ERRO OAUTH:', error);
      Alert.alert('Erro', 'Não foi possível conectar com o Google');
      setIsAuthenticating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>VOLLY</Text>
        <Text style={styles.sloganText}>Juntos Fazemos a Diferença</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.infoText}>
          O acesso é restrito aos voluntários previamente cadastrados.
        </Text>

        <TouchableOpacity 
          style={[styles.button, isAuthenticating && styles.buttonDisabled]} 
          onPress={handleGoogleLogin}
          disabled={isAuthenticating}
        >
          {isAuthenticating ? (
             <View style={{ alignItems: 'center' }}>
               <ActivityIndicator color="#121212" size="large" />
               <Text style={[styles.infoText, { marginTop: 10, color: '#121212' }]}>
                 Finalize no navegador...
               </Text>
             </View>
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#121212" style={styles.icon} />
              <Text style={styles.buttonText}>Entrar com Google</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...globalStyles.container,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '900',
    color: theme.colors.primary,
    letterSpacing: 2,
  },
  sloganText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  formContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    alignItems: 'center'
  },
  infoText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  icon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
