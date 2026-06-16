import { supabase } from './supabase';

export interface GlobalSong {
  id: string;
  title: string;
  artist: string;
  tags?: string[];
  created_by?: string;
  usage_count?: number;
  created_at?: string;
}

export interface EventSong {
  id?: string;
  event_id: string;
  song_id: string;
  order?: number;
  youtube_url?: string;
  spotify_url?: string;
  tonalidade?: string;
  notes?: string;
  created_at?: string;
  global_song?: GlobalSong; // Relacionamento
}

export const songService = {
  // 1. Buscar músicas globais (Autocomplete)
  searchGlobalSongs: async (queryText: string) => {
    let query = supabase
      .from('global_songs')
      .select('*')
      .order('usage_count', { ascending: false })
      .limit(20);

    if (queryText) {
      query = query.or(`title.ilike.%${queryText}%,artist.ilike.%${queryText}%`);
    }

    const { data, error } = await query;
    return { data, error };
  },

  // 2. Criar nova música global
  createGlobalSong: async (song: { title: string; artist: string; tags?: string[] }) => {
    // Pegar o ID do usuário autenticado atual
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const { data, error } = await supabase
      .from('global_songs')
      .insert([{
        ...song,
        created_by: userId
      }])
      .select()
      .single();

    return { data, error };
  },

  // 3. Buscar músicas de um evento específico
  getEventSongs: async (eventId: string) => {
    const { data, error } = await supabase
      .from('event_songs')
      .select(`
        *,
        global_song:global_songs(*)
      `)
      .eq('event_id', eventId)
      .order('order', { ascending: true });

    return { data, error };
  },

  // 4. Adicionar música a um evento
  addSongToEvent: async (eventSong: Partial<EventSong>) => {
    const { data, error } = await supabase
      .from('event_songs')
      .insert([eventSong])
      .select(`
        *,
        global_song:global_songs(*)
      `)
      .single();

    return { data, error };
  },

  // 5. Atualizar detalhes de uma música no evento (links, notas, ordem)
  updateEventSong: async (eventSongId: string, updates: Partial<EventSong>) => {
    const { data, error } = await supabase
      .from('event_songs')
      .update(updates)
      .eq('id', eventSongId)
      .select()
      .single();

    return { data, error };
  },

  // 6. Remover música de um evento
  removeSongFromEvent: async (eventSongId: string) => {
    return await supabase
      .from('event_songs')
      .delete()
      .eq('id', eventSongId);
  },

  // 7. Buscar Top Músicas (para a tela de Playlist Global)
  getTopGlobalSongs: async (limit: number = 50) => {
    const { data, error } = await supabase
      .from('global_songs')
      .select('*')
      .order('usage_count', { ascending: false })
      .limit(limit);

    return { data, error };
  }
};
