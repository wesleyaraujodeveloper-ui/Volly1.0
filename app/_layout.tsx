import { useEffect } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useAppStore } from '../src/store/useAppStore';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../src/services/supabase';
import { useNotifications } from '../src/hooks/useNotifications';
import { useFonts } from 'expo-font';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'CreamCake': require('../assets/fonts/Cream Cake.otf'),
  });

  // useNotifications(); // Desativado temporariamente para evitar crash no Expo Go SDK 53
  
  const { user, setUser, isLoadingData, setIsLoadingData, setProviderToken } = useAppStore();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key) return;

    const handleSession = async (session: any) => {
      console.log('DEBUG: handleSession iniciado. Session:', !!session);
      try {
        if (session?.user) {
          // Busca o perfil
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error && error.message.includes('Refresh Token Not Found')) {
            console.log('Sessão expirada, deslogando...');
            await supabase.auth.signOut();
            setUser(null);
            return;
          }

          if (profile) {
            setUser({
              id: profile.id,
              name: profile.full_name || '',
              email: profile.email || session.user.email || '',
              role: (profile.access_level as any) || 'VOLUNTÁRIO',
              avatar_url: profile.avatar_url
            });
            
            // Salva o token do provedor (Google) se disponível na sessão
            if (session.provider_token) {
              setProviderToken(session.provider_token);
            }
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('DEBUG: Erro no handleSession:', err);
        setUser(null);
      } finally {
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

  if (!fontsLoaded) {
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
