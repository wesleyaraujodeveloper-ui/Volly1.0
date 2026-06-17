import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventSong } from './songService';

const HOLYRICS_CONFIG_KEY = '@holyrics_config';

export interface HolyricsConfig {
  ip: string;
  port: string;
  token: string;
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

  // Remove credentials (logout from Holyrics)
  clearConfig: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(HOLYRICS_CONFIG_KEY);
    } catch (e) {
      console.error('Failed to clear holyrics config', e);
    }
  },

  // Test connection to Holyrics
  testConnection: async (config: HolyricsConfig): Promise<{ success: boolean; message?: string }> => {
    try {
      const cleanIp = config.ip.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
      const url = `http://${cleanIp}:${config.port}/api/status?token=${config.token}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 sec timeout

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status === 404) {
        return { success: true };
      }

      return { success: false, message: `Servidor retornou erro: ${response.status}` };
    } catch (error: any) {
      return { success: false, message: error.name === 'AbortError' ? 'Timeout: O servidor demorou muito para responder.' : 'Falha na conexão. Verifique o IP e a porta.' };
    }
  },

  // Generic payload structure to export songs.
  // This structure will be adapted once the user tests it with their actual Holyrics setup.
  exportPlaylist: async (config: HolyricsConfig, songs: EventSong[]): Promise<{ success: boolean; message?: string }> => {
    try {
      const cleanIp = config.ip.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
      const url = `http://${cleanIp}:${config.port}/api/playlist/add?token=${config.token}`;

      const payload = {
        items: songs.map((s, index) => ({
          type: "song",
          title: s.global_song?.title,
          artist: s.global_song?.artist,
          order: index + 1
        }))
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return { success: true };
      } else {
        const errorText = await response.text();
        return { success: false, message: `Erro ao enviar para o Holyrics: ${response.status} - ${errorText}` };
      }
    } catch (error: any) {
      return { success: false, message: error.name === 'AbortError' ? 'Timeout ao enviar playlist.' : 'Falha na conexão com o Holyrics.' };
    }
  }
};
