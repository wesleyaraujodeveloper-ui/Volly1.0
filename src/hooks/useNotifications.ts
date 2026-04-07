import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../services/supabase';
import { useAppStore } from '../store/useAppStore';

// === SISTEMA DE NOTIFICAÇÕES DESATIVADO TEMPORARIAMENTE ===
// O pacote expo-notifications causa crash no Expo Go na SDK 53
// Devido à tentativa de registro automático na raiz do pacote.
// Para reativar, será necessário rodar um Custom Development Build.

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
  const [notification, setNotification] = useState<any | undefined>(undefined);
  
  const { user } = useAppStore();

  useEffect(() => {
    // Apenas retorna silenciosamente para não desestruturar o Layout
    return () => {};
  }, [user?.id]);

  return { expoPushToken, notification };
}

