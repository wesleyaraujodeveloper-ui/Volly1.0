import 'react-native-url-polyfill/auto';
import { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Alert, Platform, AppState, AppStateStatus } from 'react-native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import Head from 'expo-router/head';
import { useAppStore } from '../src/store/useAppStore';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../src/services/supabase';
import { useNotifications } from '../src/hooks/useNotifications';
import { useFonts } from 'expo-font';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { systemService } from '../src/services/systemService';
import { APP_VERSION } from '../src/constants/config';
import { UpdateAvailableModal } from '../src/components/modals/UpdateAvailableModal';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos de cache
      gcTime: 1000 * 60 * 60 * 24, // 24 horas (mantém em disco por um dia inteiro)
      retry: 2,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

export default function RootLayout() {
  const [isMounted, setIsMounted] = useState(false);
  const [fontsLoaded] = useFonts({
    'CreamCake': require('../assets/fonts/CreamCake.otf'),
  });

  const [updateAvailable, setUpdateAvailable] = useState(false);
  const appState = useRef(AppState.currentState);
  const lastUserId = useRef<string | null>(null);

  const checkVersion = async () => {
    // Apenas checa se estiver montado
    try {
      const { app_version } = await systemService.getLatestVersion();
      if (app_version && app_version !== APP_VERSION) {
        setUpdateAvailable(true);
      }
    } catch (e) {
      console.log('Erro ao checar versão', e);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    checkVersion();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        checkVersion();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useNotifications();
  
  const { user, setUser, isLoadingData, setIsLoadingData, setProviderToken } = useAppStore();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  // Adicionado para diagnosticar travamentos no carregamento e garantir exibição
  useEffect(() => {
    console.log('DEBUG: RootLayout Status:', { isMounted, fontsLoaded, isLoadingData });
    
    const safetyTimer = setTimeout(() => {
      if (isLoadingData) {
        console.warn('DEBUG: O carregamento está demorando muito. Forçando exibição da interface.');
        setIsLoadingData(false);
      }
    }, 6000);

    return () => clearTimeout(safetyTimer);
  }, [isLoadingData, fontsLoaded, isMounted]);

  useEffect(() => {
    const handleSession = async (session: any) => {
      const currentId = session?.user?.id || null;
      
      const currentState = useAppStore.getState();
      
      // EVITA LOOP: Se o ID for o mesmo e já temos usuário, não processa novamente
      if (currentId === lastUserId.current && currentState.user && !currentState.isLoadingData) {
        return;
      }

      console.log('DEBUG: handleSession iniciado. Evento:', !!session ? 'SESSÃO_ATIVA' : 'SEM_SESSÃO');
      lastUserId.current = currentId;
      
      // Só marca como carregando se houver mudança real
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
              access_level: (profile.access_level as any) || 'VOLUNTÁRIO',
              avatar_url: profile.avatar_url,
              institution_id: profile.institution_id
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
                access_level: 'VOLUNTÁRIO',
                avatar_url: newProfile.avatar_url
              });
            } else {
              console.log('DEBUG: Perfil sincronizado com sucesso no banco de dados!');
              setUser({
                id: upsertedProfile.id,
                name: upsertedProfile.full_name || '',
                email: upsertedProfile.email || '',
                role: (upsertedProfile.access_level as any) || 'VOLUNTÁRIO',
                access_level: (upsertedProfile.access_level as any) || 'VOLUNTÁRIO',
                avatar_url: upsertedProfile.avatar_url,
                institution_id: upsertedProfile.institution_id
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

    // Em Supabase v2, onAuthStateChange dispara o evento 'INITIAL_SESSION' automaticamente
    // Portanto, não precisamos chamar getSession() manualmente aqui se já estamos escutando
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
       console.log('DEBUG: onAuthStateChange event:', event);
       handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoadingData || !navigationState?.key) return;
    const inAuthGroup = segments[0] === '(auth)';
    
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)/feed');
    }
  }, [user, isLoadingData, segments, navigationState?.key]);

  if (isLoadingData || !fontsLoaded || !isMounted) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#DF721B" />
      </View>
    );
  }

  return (
    <>
      {Platform.OS === 'web' && (
        <Head>
          <meta name="google" content="notranslate" />
        </Head>
      )}
      <StatusBar style="light" />
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000000' } }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </PersistQueryClientProvider>
      <UpdateAvailableModal 
        visible={updateAvailable} 
        onUpdate={() => {
          if (Platform.OS === 'web') {
            window.location.reload();
          } else {
            // Em React Native puro seria Updates.reloadAsync(), mas vamos ignorar se for PWA focado em Web
            Alert.alert("Atualização", "Por favor, reinicie o aplicativo.");
          }
        }} 
      />
    </>
  );
}

