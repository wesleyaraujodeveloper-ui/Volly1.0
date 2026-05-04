import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { supabaseStorage } from '../lib/storage';

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '') as string;
const supabaseKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '') as string;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: supabaseStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
