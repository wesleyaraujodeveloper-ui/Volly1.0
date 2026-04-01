import { useEffect } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useAppStore } from '../src/store/useAppStore';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  const { user } = useAppStore();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Evita navegar antes da navegação root ser montada
    if (!navigationState?.key) return;

    const inAuthGroup = segments[0] === '(auth)';
    
    if (!user && !inAuthGroup) {
      // Se não tem usuário e não está nas rotas de login, redireciona pro login
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Se tiver logado e tentar ir pro login, redireciona pras tabs
      router.replace('/(tabs)/feed');
    }
  }, [user, segments, navigationState?.key]);

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
