import { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import { theme } from '../../src/theme';

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
          console.log('DEBUG: Sessão confirmada via getSession. Aguardando Store atualizar...');
          // Não redirecionamos manualmente aqui. 
          // O _layout.tsx detectará o 'user' no store e fará o redirecionamento seguro.
        } else {
          console.log('DEBUG: Nenhuma sessão encontrada após callback via getSession.');
          // Apenas se realmente não houver sessão APÓS o processamento tentamos voltar
          // Mas vamos dar um tempo para os listeners agirem.
          setTimeout(() => {
             router.replace('/(auth)/login');
          }, 2000);
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
