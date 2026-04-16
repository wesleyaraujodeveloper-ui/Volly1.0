import { create } from 'zustand';

export type Role = 'ADMIN' | 'LÍDER' | 'CO-LÍDER' | 'VOLUNTÁRIO';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar_url?: string;
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

export const useAppStore = create<AppState>((set) => ({
  user: null, // O usuário logado atualmente (null = deslogado)
  setUser: (user) => set({ user }),
  
  providerToken: null,
  setProviderToken: (token) => set({ providerToken: token }),
  
  isLoadingData: true, // Começa em true enquanto checa a sessão no Supabase
  setIsLoadingData: (loading) => set({ isLoadingData: loading }),

  clearSession: () => set({ user: null, providerToken: null }),
}));
