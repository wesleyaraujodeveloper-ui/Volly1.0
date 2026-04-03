import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Checks if we are running on the server (Node.js) where 'window' is not defined
const isServer = typeof window === 'undefined';

/**
 * A wrapper around AsyncStorage that is safe for environments without 'window' (SSR/Node).
 * It also handles the 'web' platform specifically to ensure compatibility.
 */
export const supabaseStorage = {
  getItem: (key: string) => {
    if (isServer) return null;
    if (Platform.OS === 'web') {
      return window.localStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (isServer) return;
    if (Platform.OS === 'web') {
      window.localStorage.setItem(key, value);
      return;
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (isServer) return;
    if (Platform.OS === 'web') {
      window.localStorage.removeItem(key);
      return;
    }
    return AsyncStorage.removeItem(key);
  },
};
