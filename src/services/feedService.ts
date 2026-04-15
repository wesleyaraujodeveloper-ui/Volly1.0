import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
  post_likes?: { user_id: string }[];
  _count?: {
    post_likes: number;
    post_comments: number;
  };
}

export const feedService = {
  /**
   * Busca o próximo evento onde o usuário está escalado.
   */
  getNextUserEvent: async (userId: string) => {
    const { data, error } = await supabase
      .from('schedules')
      .select(`
        id,
        status,
        events!inner (
          id,
          title,
          event_date,
          description,
          event_departments (
            departments (
              id,
              name
            )
          )
        ),
        roles (
          id,
          name
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'CONFIRMADO')
      .gte('events.event_date', new Date().toISOString())
      .order('event_date', { foreignTable: 'events', ascending: true })
      .limit(1)
      .maybeSingle();

    return { data, error };
  },

  /**
   * Busca o panorama geral da escala agrupado por evento, função e equipes.
   */
  getGlobalSchedulePanorama: async () => {
    // Retorna todos os eventos a partir de hoje num raio razoável, com a estrutura completa
    const { data, error } = await supabase
      .from('events')
      .select(`
        id,
        title,
        event_date,
        schedules (
          id,
          status,
          user_id,
          profiles (full_name, avatar_url),
          roles (
            id,
            name,
            departments (id, name)
          )
        )
      `)
      .gte('event_date', new Date().toISOString().split('T')[0] + 'T00:00:00') // Do começo do dia de hoje em diante
      .order('event_date', { ascending: true })
      .limit(10); // Limita para os próximos 10 eventos

    return { data, error };
  },

  /**
   * Busca o próximo evento geral (para todos os usuários).
   */
  getNextGlobalEvent: async () => {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        event_departments (
          departments (
            name
          )
        )
      `)
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    return { data, error };
  },

  /**
   * Busca sugestões de músicas baseadas nas playlists recentes.
   */
  getRecommendedSongs: async (limit: number = 5) => {
    const { data, error } = await supabase
      .from('playlists')
      .select('links')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) return { data: [], error };

    // Achata a lista de links JSONB e remove duplicados (pelo nome)
    const allSongs: any[] = [];
    const names = new Set();

    data?.forEach(p => {
      const links = Array.isArray(p.links) ? p.links : [];
      links.forEach((s: any) => {
        if (!names.has(s.name)) {
          names.add(s.name);
          allSongs.push(s);
        }
      });
    });

    return { data: allSongs.slice(0, 10), error: null };
  },

  /**
   * Lista o mural social.
   */
  listPosts: async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (full_name, avatar_url),
        post_likes (user_id),
        post_comments (id)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return { data: [], error };
    }

    if (!data) return { data: [], error: null };

    // Mapeia para incluir contadores
    const formattedPosts = data.map(post => ({
      ...post,
      likesCount: post.post_likes?.length || 0,
      commentsCount: post.post_comments?.length || 0
    }));

    return { data: formattedPosts, error: null };
  },

  /**
   * Cria uma nova postagem.
   */
  createPost: async (userId: string, content: string, imageUrl?: string) => {
    return await supabase
      .from('posts')
      .insert([{ user_id: userId, content, image_url: imageUrl }])
      .select()
      .single();
  },

  /**
   * Inscreve-se para atualizações em tempo real no feed (posts, curtidas e comentários).
   */
  subscribeToFeed: (onUpdate: () => void) => {
    return supabase
      .channel('public:feed_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, payload => {
        onUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, payload => {
        onUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, payload => {
        onUpdate();
      })
      .subscribe();
  },

  /**
   * Faz o upload de uma imagem do dispositivo para o bucket 'mural'.
   */
  uploadPostImage: async (base64Data: string) => {
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from('mural')
        .upload(filePath, decode(base64Data), {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('mural')
        .getPublicUrl(data.path);

      return { publicUrl, error: null };
    } catch (error) {
      console.error('Upload error:', error);
      return { publicUrl: null, error };
    }
  },

  /**
   * Alterna curtida em um post.
   */
  toggleLike: async (postId: string, userId: string) => {
    // Verifica se já curtiu
    const { data: existing } = await supabase
      .from('post_likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
    } else {
      return await supabase
        .from('post_likes')
        .insert([{ post_id: postId, user_id: userId }]);
    }
  },

  /**
   * Busca os comentários de um post.
   */
  getComments: async (postId: string) => {
    return await supabase
      .from('post_comments')
      .select('*, profiles:user_id(full_name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
  },

  /**
   * Adiciona um comentário a um post.
   */
  addComment: async (postId: string, userId: string, content: string) => {
    return await supabase
      .from('post_comments')
      .insert([{ post_id: postId, user_id: userId, content }])
      .select()
      .single();
  },

  /**
   * Exclui uma postagem.
   */
  deletePost: async (postId: string) => {
    return await supabase
      .from('posts')
      .delete()
      .eq('id', postId);
  }
};
