import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useAppStore } from '../src/store/useAppStore';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../src/services/supabase';
import { useNotifications } from '../src/hooks/useNotifications';
import { useFonts } from 'expo-font';

export default function RootLayout() {
  const [isMounted, setIsMounted] = useState(false);
  const [fontsLoaded] = useFonts({
    'CreamCake': require('../assets/fonts/Cream Cake.otf'),
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // useNotifications(); // Desativado temporariamente para evitar crash no Expo Go SDK 53
  
  const { user, setUser, isLoadingData, setIsLoadingData, setProviderToken } = useAppStore();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key) return;

    const handleSession = async (session: any) => {
      console.log('DEBUG: handleSession iniciado. Evento:', !!session ? 'SESSÃO_ATIVA' : 'SEM_SESSÃO');
      
      // Sempre marcar como carregando ao processar uma possível mudança de estado
      setIsLoadingData(true);

      try {
        if (session?.user) {
          console.log('DEBUG: Buscando perfil para user:', session.user.id);
          
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.log('DEBUG: Erro ao buscar perfil:', error.message);
            // Se o erro for Refresh Token, apenas logamos. Não chamamos signOut aqui 
            // para evitar conflito durante o fluxo de login inicial.
            if (error.message.includes('Refresh Token Not Found')) {
              console.log('DEBUG: Refresh Token inválido detectado.');
            }
          }

          if (profile) {
            console.log('DEBUG: Perfil encontrado:', profile.full_name);
            setUser({
              id: profile.id,
              name: profile.full_name || '',
              email: profile.email || session.user.email || '',
              role: (profile.access_level as any) || 'VOLUNTÁRIO',
              avatar_url: profile.avatar_url
            });
          } else {
            console.log('DEBUG: Perfil não encontrado. Iniciando sincronização ativa...');
            
            // Dados para o novo perfil vindo dos metadados da sessão
            const newProfile = {
              id: session.user.id,
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Voluntário',
              avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
            };

            // Tenta criar o perfil diretamente (caso o trigger tenha falhado)
            const { data: upsertedProfile, error: upsertError } = await supabase
              .from('profiles')
              .upsert(newProfile)
              .select('*')
              .single();

            if (upsertError) {
              console.error('DEBUG: Erro ao sincronizar perfil (fallback local):', upsertError.message);
              // Fallback local se tudo falhar (ex: problemas de rede ou RLS)
              setUser({
                id: session.user.id,
                name: newProfile.full_name,
                email: session.user.email || '',
                role: 'VOLUNTÁRIO',
                avatar_url: newProfile.avatar_url
              });
            } else {
              console.log('DEBUG: Perfil sincronizado com sucesso no banco de dados!');
              setUser({
                id: upsertedProfile.id,
                name: upsertedProfile.full_name || '',
                email: upsertedProfile.email || '',
                role: (upsertedProfile.access_level as any) || 'VOLUNTÁRIO',
                avatar_url: upsertedProfile.avatar_url
              });
            }
          }
          
          if (session.provider_token) {
            setProviderToken(session.provider_token);
          }
        } else {
          console.log('DEBUG: Nenhuma sessão ativa conectada.');
          setUser(null);
        }
      } catch (err) {
        console.error('DEBUG: Erro crítico no handleSession:', err);
      } finally {
        console.log('DEBUG: handleSession finalizado. Configurando isLoadingData(false)');
        setIsLoadingData(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.log('Erro ao recuperar sessão:', error.message);
        setIsLoadingData(false);
        return;
      }
      handleSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
       handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, [navigationState?.key]);

  useEffect(() => {
    if (isLoadingData || !navigationState?.key) return;
    const inAuthGroup = segments[0] === '(auth)';
    
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)/feed');
    }
  }, [user, isLoadingData, segments, navigationState?.key]);

  if (!fontsLoaded || !isMounted) {
    return (
      <View style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#121212' } }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
