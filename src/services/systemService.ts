import { supabase } from './supabase';

export const systemService = {
  getLatestVersion: async () => {
    const { data, error } = await supabase
      .from('system_config')
      .select('app_version')
      .eq('id', 1)
      .single();
    
    if (error) {
      console.error('Erro ao buscar versão:', error);
      return { app_version: null, error };
    }
    
    return { app_version: data.app_version, error: null };
  },

  updateVersion: async (newVersion: string) => {
    const { data, error } = await supabase
      .from('system_config')
      .update({ app_version: newVersion, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single();
    
    return { data, error };
  }
};
