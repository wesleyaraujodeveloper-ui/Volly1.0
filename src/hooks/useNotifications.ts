import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../services/supabase';
import { useAppStore } from '../store/useAppStore';

import { useRouter } from 'expo-router';

// Configuração do comportamento das notificações quando o app está aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.MAX,
  } as any),
});

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);
  const router = useRouter();
  
  const { user } = useAppStore();

  useEffect(() => {
    if (user?.id) {
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          setExpoPushToken(token);
          // Salva o token no perfil do usuário no Supabase
          supabase
            .from('profiles')
            .update({ expo_push_token: token })
            .eq('id', user.id)
            .then(({ error }) => {
              if (error) console.error('Erro ao salvar token de push:', error);
            });
        }
      });

      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        setNotification(notification);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        
        // Deep Linking: Navegar para a tela correta baseada no dado da notificação
        if (data?.screen && data?.related_id) {
          if (data.screen === 'Escalas' || data.screen === 'Eventos') {
            router.push(`/events/${data.related_id}`);
          }
        }
      });

      return () => {
        if (notificationListener.current) notificationListener.current.remove();
        if (responseListener.current) responseListener.current.remove();
      };
    }
  }, [user?.id]);

  return { expoPushToken, notification };
}

async function registerForPushNotificationsAsync() {
  let token;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // No Web ou em Dispositivo Físico
    if (Device.isDevice || Platform.OS === 'web') {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Falha ao obter permissão para notificações push!');
        return;
      }
      
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      
      token = (await Notifications.getExpoPushTokenAsync({ 
        projectId,
        ...(Platform.OS !== 'web' ? { applicationId: 'com.wesleydeveloper.volly' } : {})
      })).data;
    } else {
      console.log('Notificações Push exigem um dispositivo físico ou configuração VAPID no Web.');
    }
  } catch (err: any) {
    if (Platform.OS === 'web' && err.message?.includes('vapidPublicKey')) {
      console.warn('Configuração de Notificações Web Pendente: Para habilitar push no browser, você precisa gerar uma VAPID Key no painel da Expo e adicionar no app.json.');
    } else {
      console.error('Erro ao registrar notificações:', err);
    }
  }

  return token;
}

