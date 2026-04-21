import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform, Image } from 'react-native';
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
  const [lastBranding, setLastBranding] = useState<{ name: string; logo_url: string | null } | null>(null);

  // Efeito para tentar carregar o branding da última igreja acessada (melhora a UX)
  useEffect(() => {
    const loadBranding = async () => {
      // Aqui poderíamos buscar do AsyncStorage, mas por agora simularemos 
      // ou buscaremos a padrão se houver apenas uma.
      // Futuramente isso virá via Deep Link (slug na URL)
    };
    loadBranding();
  }, []);

  const handleGoogleLogin = async () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement && typeof activeElement.blur === 'function') {
        activeElement.blur();
      }
    }

    try {
      setIsAuthenticating(true);
      console.log('--- INICIANDO OAUTH ---');
      
      // Ajuste crítico para o Vercel: garantir que o redirecionamento caia no /auth-callback
      const redirectTo = Platform.OS === 'web' 
        ? `${window.location.origin}/auth-callback`
        : AuthSession.makeRedirectUri({
            scheme: 'vollyapp',
            preferLocalhost: false,
          });

      console.log('Iniciando login Google com redirectTo:', redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          scopes: 'https://www.googleapis.com/auth/calendar.events',
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
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
            console.log('Login bem sucedido! URL de retorno:', result.url);
            
            // Verifica se a URL contém erro (ex: bad_oauth_state)
            if (result.url.includes('error=')) {
              const errorMsg = new URLSearchParams(result.url.split('?')[1]).get('error_description');
              Alert.alert('Erro na Autenticação', errorMsg || 'O estado da sessão expirou. Tente novamente.');
              return;
            }

            const hash = result.url.split('#')[1];
            const query = result.url.split('?')[1];
            const params = new URLSearchParams(hash || query);
            
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken && refreshToken) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (sessionError) throw sessionError;
              console.log('Sessão estabelecida com sucesso!');
            } else {
               // Dependendo da config, pode vir um código PKCE
               const code = params.get('code');
               if (code) {
                  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                  if (exchangeError) throw exchangeError;
               } else {
                  throw new Error('Tokens não encontrados na URL de resposta.');
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image 
            source={lastBranding?.logo_url ? { uri: lastBranding.logo_url } : require('../../assets/images/icons/volly-logo.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text 
            style={{ fontFamily: 'CreamCake', color: theme.colors.primary, fontSize: 64, marginLeft: 10 }}
            // @ts-ignore - Propriedades para evitar tradução automática no navegador
            translate="no"
            className="notranslate"
          >
            {lastBranding?.name || 'Volly'}
          </Text>
        </View>
        <Text style={styles.sloganText}>
          {lastBranding ? `Conectado à ${lastBranding.name}` : 'Juntos Fazemos a Diferença'}
        </Text>
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
  logoImage: {
    width: 65,
    height: 65,
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
