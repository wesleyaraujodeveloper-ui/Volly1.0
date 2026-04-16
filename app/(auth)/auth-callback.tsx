import { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    console.log('DEBUG: AuthCallback montado. Processando redirect...');
    
    const handleRedirect = async () => {
      try {
        // No ambiente web, o Supabase pode retornar um código (PKCE) na URL
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const code = params.get('code');
          const error = params.get('error_description');

          if (error) {
            console.error('Erro no redirect do Google:', error);
            router.replace('/(auth)/login');
            return;
          }

          if (code) {
             console.log('DEBUG: Código PKCE detectado, trocando por sessão...');
             const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
             if (exchangeError) throw exchangeError;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        console.log('DEBUG: AuthCallback session check:', !!session);
        
        if (session) {
          console.log('DEBUG: Sessão confirmada, indo para o Feed.');
          router.replace('/(tabs)/feed');
        } else {
          // Se não houver sessão nem código, voltamos para o login após um tempo
          console.log('DEBUG: Nenhuma sessão encontrada após callback.');
          router.replace('/(auth)/login');
        }
      } catch (err) {
        console.error('Erro no processamento do callback:', err);
        router.replace('/(auth)/login');
      }
    };

    handleRedirect();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={{ color: '#FFFFFF', marginTop: 20, fontSize: 16, fontWeight: 'bold' }}>
        Validando sua conta...
      </Text>
      <Text style={{ color: theme.colors.textSecondary, marginTop: 8, fontSize: 13 }}>
        Isso leva apenas um instante.
      </Text>
    </View>
  );
}
