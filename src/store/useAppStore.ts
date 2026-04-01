import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoadingData: boolean;
  setIsLoadingData: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null, // O usuário logado atualmente (null = deslogado)
  setUser: (user) => set({ user }),
  
  isLoadingData: false,
  setIsLoadingData: (loading) => set({ isLoadingData: loading }),
}));
