import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventSong } from './songService';
import { supabase } from './supabase';

const HOLYRICS_CONFIG_KEY = '@holyrics_config_cloud';

export interface HolyricsConfig {
  connectionCode: string;
}

export const holyricsService = {
  // Save credentials locally
  saveConfig: async (config: HolyricsConfig): Promise<void> => {
    try {
      await AsyncStorage.setItem(HOLYRICS_CONFIG_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save holyrics config', e);
    }
  },

  // Load credentials from local storage
  loadConfig: async (): Promise<HolyricsConfig | null> => {
    try {
      const jsonValue = await AsyncStorage.getItem(HOLYRICS_CONFIG_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      console.error('Failed to load holyrics config', e);
      return null;
    }
  },

  // Remove credentials
  clearConfig: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(HOLYRICS_CONFIG_KEY);
    } catch (e) {
      console.error('Failed to clear holyrics config', e);
    }
  },

  // Test connection to the cloud (just saves the code for now)
  testConnection: async (config: HolyricsConfig): Promise<{ success: boolean; message?: string }> => {
    try {
      if (!config.connectionCode || config.connectionCode.trim().length === 0) {
        return { success: false, message: 'Código de conexão inválido.' };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, message: 'Falha ao salvar configuração.' };
    }
  },

  // Export playlist to Supabase cloud table
  exportPlaylist: async (config: HolyricsConfig, songs: EventSong[], event?: any): Promise<{ success: boolean; message?: string }> => {
    try {
      const code = config.connectionCode.trim();
      if (!code) return { success: false, message: 'Código de conexão obrigatório.' };

      // 1. Extrair URLs de mídia do evento (campo media_links)
      const mediaUrls: string[] = [];
      if (event && event.media_links && Array.isArray(event.media_links)) {
        mediaUrls.push(...event.media_links);
      }

      // 2. Construir payload (Músicas + Mídias)
      const items = songs.map((s, index) => ({
        type: "song",
        title: s.global_song?.title,
        artist: s.global_song?.artist,
        order: index + 1
      }));

      mediaUrls.forEach((url, i) => {
        // Tenta deduzir o nome do arquivo a partir da URL, ou usa um genérico
        const urlObj = new URL(url);
        let title = urlObj.pathname.split('/').pop() || `media_${i + 1}`;
        // Não forçar `.mp4` aqui. Deixar o backend (Connector) descobrir a extensão real via Content-Disposition
        
        items.push({
          type: "media",
          url: url,
          title: decodeURIComponent(title),
          order: items.length + 1
        } as any);
      });

      const payload = {
        items: items
      };

      // 1. Insert request into Supabase
      const { data, error } = await supabase
        .from('holyrics_exports')
        .insert({
          connection_code: code,
          payload: payload,
          status: 'pending'
        })
        .select('id')
        .single();

      if (error || !data) {
        console.error("Erro ao inserir no Supabase:", error);
        return { success: false, message: 'Falha ao enviar requisição para a nuvem.' };
      }

      const exportId = data.id;

      // 2. Poll for status change (timeout after 15 seconds)
      let attempts = 0;
      while (attempts < 15) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // wait 1 sec

        const { data: checkData, error: checkError } = await supabase
          .from('holyrics_exports')
          .select('status, message')
          .eq('id', exportId)
          .single();

        if (checkData) {
          if (checkData.status === 'completed') {
            return { success: true };
          } else if (checkData.status === 'failed') {
            return { success: false, message: checkData.message || 'O PC da Igreja não conseguiu enviar para o Holyrics.' };
          }
        }
        attempts++;
      }

      // If we reach here, it timed out
      // Mark as timed_out so the PC ignores it if it wakes up late
      await supabase.from('holyrics_exports').update({ status: 'timed_out' }).eq('id', exportId);

      return { success: false, message: 'Timeout: O PC da igreja não respondeu. O Volly Connector está aberto lá?' };

    } catch (error: any) {
      return { success: false, message: 'Falha inesperada ao comunicar com a nuvem.' };
    }
  }
};

