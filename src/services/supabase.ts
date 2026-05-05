import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { supabaseStorage } from '../lib/storage';

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co') as string;
const supabaseKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder') as string;

// Log de diagnóstico para o console do navegador
if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Variáveis de ambiente do Supabase não encontradas. O app pode não carregar dados corretamente.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: supabaseStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
