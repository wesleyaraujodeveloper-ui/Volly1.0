import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../services/supabase';
import { useAppStore } from '../store/useAppStore';

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
  
  const { user } = useAppStore();

  useEffect(() => {
    // PROTEÇÃO: O sistema de notificações causa crash no Expo Go SDK 53
    // Só tentamos registrar se NÃO estivermos no Expo Go ou se for um build real
    if (Constants.appOwnership === 'expo') {
      console.log('Notificações desativadas no Expo Go para evitar crash (SDK 53).');
      return;
    }

    if (user?.id) {
      registerForPushNotificationsAsync().then(token => {
        setExpoPushToken(token);
        if (token) {
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
        console.log(response);
      });

      return () => {
        notificationListener.current?.remove();
        responseListener.current?.remove();
      };
    }
  }, [user?.id]);

  return { expoPushToken, notification };
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
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
    
    // Project ID do Expo é necessário para a SDK 51+
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } else {
    console.log('Notificações Push exigem um dispositivo físico.');
  }

  return token;
}

