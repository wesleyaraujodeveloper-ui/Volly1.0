import { useEffect } from 'react';
import { Alert } from 'react-native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useAppStore } from '../src/store/useAppStore';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../src/services/supabase';
import { useNotifications } from '../src/hooks/useNotifications';

export default function RootLayout() {
  useNotifications();
  const { user, setUser, isLoadingData, setIsLoadingData, setProviderToken } = useAppStore();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key) return;

    // Função para Processar a Sessão
    const handleSession = async (session: any) => {
      console.log('DEBUG: handleSession iniciado. Session:', !!session);
      try {
        if (session?.user) {
          console.log('DEBUG: Usuário autenticado:', session.user.email);
          
          if (session.provider_token) {
            setProviderToken(session.provider_token);
          }
          
          // Busca o perfil pelo ID (já deve ter sido criado pelo Trigger no BD)
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.log('DEBUG: Erro ao buscar perfil:', error.message);
          }

          if (profile) {
            console.log('DEBUG: Perfil encontrado:', profile.email, 'Role:', profile.access_level);
            setUser({
              id: profile.id,
              name: profile.full_name || '',
              email: profile.email || session.user.email || '',
              role: (profile.access_level as any) || 'VOLUNTÁRIO'
            });
          } else {
            console.log('DEBUG: Perfil não encontrado no banco para o ID:', session.user.id);
            // Se o usuário logou mas não tem perfil (o gatilho barrou pois não tinha convite)
            await supabase.auth.signOut();
            setUser(null);
            Alert.alert('Acesso Negado', 'Seu e-mail não foi convidado para acessar este aplicativo.');
          }
        } else {
          console.log('DEBUG: Nenhuma sessão ativa.');
          setUser(null);
          setProviderToken(null);
        }
      } catch (err) {
        console.error('DEBUG: Crash no handleSession:', err);
        setUser(null);
      } finally {
        console.log('DEBUG: setIsLoadingData(false)');
        setIsLoadingData(false);
      }
    };

    // 1. Busca a sessão atual imediatamente (Initial Load)
    console.log('DEBUG: Executando getSession inicial...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // 2. Escuta mudanças na autenticação (Login/Logout/OAuth)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
       console.log('DEBUG: onAuthStateChange Event:', event);
       handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, [navigationState?.key, setUser, setIsLoadingData]);

  // Efeito de Redirecionamento baseado no estado do User
  useEffect(() => {
    if (isLoadingData || !navigationState?.key) return;

    const inAuthGroup = segments[0] === '(auth)';
    
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)/feed');
    }
  }, [user, isLoadingData, segments, navigationState?.key]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#121212' },
          animation: 'slide_from_right'
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
