import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Role = 'MASTER' | 'ADMIN' | 'LÍDER' | 'CO-LÍDER' | 'VOLUNTÁRIO';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  access_level?: Role; // Adicionado para compatibilidade com partes do código que usam este campo
  avatar_url?: string;
  institution_id?: string | null;
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  providerToken: string | null;
  setProviderToken: (token: string | null) => void;
  isLoadingData: boolean;
  setIsLoadingData: (loading: boolean) => void;
  clearSession: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null, // O usuário logado atualmente (null = deslogado)
      setUser: (user) => set({ user }),
      
      providerToken: null,
      setProviderToken: (token) => set({ providerToken: token }),
      
      isLoadingData: true, // Começa em true enquanto checa a sessão no Supabase
      setIsLoadingData: (loading) => set({ isLoadingData: loading }),

      clearSession: () => set({ user: null, providerToken: null }),
    }),
    {
      name: 'volly-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user }), // Persistimos apenas o usuário para carregamento imediato
    }
  )
);
