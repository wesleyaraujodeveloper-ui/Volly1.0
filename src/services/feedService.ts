import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';
import { notificationService } from './notificationService';

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  institution_id?: string;
  visibility?: 'INTERNAL' | 'GLOBAL';
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
  getGlobalSchedulePanorama: async (institutionId?: string | null) => {
    let query = supabase
      .from('events')
      .select(`
        id,
        title,
        event_date,
        institution_id,
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
      .gte('event_date', new Date().toISOString().split('T')[0] + 'T00:00:00');

    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }

    const { data, error } = await query.order('event_date', { ascending: true }).limit(10);

    return { data, error };
  },

  /**
   * Busca o próximo evento geral (para todos os usuários).
   */
  getNextGlobalEvent: async (institutionId?: string | null) => {
    let query = supabase
      .from('events')
      .select(`
        *,
        event_departments (
          departments (
            name
          )
        )
      `)
      .gte('event_date', new Date().toISOString());

    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }

    const { data, error } = await query.order('event_date', { ascending: true }).limit(1).maybeSingle();

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
   * Lista o mural social com isolamento institucional.
   */
  listPosts: async (institutionId?: string | null) => {
    let query = supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (full_name, avatar_url),
        post_likes (user_id),
        post_comments (id)
      `);

    if (institutionId) {
      // MASTER vê tudo, ADMIN/VOLUNTÁRIO vê da sua church + global
      query = query.or(`institution_id.eq.${institutionId},visibility.eq.GLOBAL`);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(20);

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
  createPost: async (userId: string, content: string, imageUrl?: string, institutionId?: string | null, visibility: 'INTERNAL' | 'GLOBAL' = 'INTERNAL') => {
    const result = await supabase
      .from('posts')
      .insert([{ 
        user_id: userId, 
        content, 
        image_url: imageUrl, 
        institution_id: institutionId,
        visibility 
      }])
      .select()
      .single();

    if (!result.error && result.data) {
      // Busca o nome do autor para a notificação
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      const senderName = profile?.full_name || 'Alguém';
      
      // Notifica a todos (o serviço deve filtrar o próprio autor se necessário, 
      // mas aqui mandamos para todos e o notifyAllUsers cuida do envio geral)
      // Idealmente o notifyAllUsers poderia receber o ID do autor para excluir, 
      // mas por simplicidade mandamos para todos.
      notificationService.notifyAllUsers(
        'Nova postagem no Mural! 📸',
        `${senderName} postou algo novo. Confira!`,
        { type: 'NEW_POST', related_id: result.data.id, screen: 'Feed' }
      );
    }

    return result;
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
      const result = await supabase
        .from('post_likes')
        .insert([{ post_id: postId, user_id: userId }]);

      if (!result.error) {
        // Busca o autor do post e o nome de quem curtiu
        const { data: post } = await supabase
          .from('posts')
          .select('user_id')
          .eq('id', postId)
          .single();

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .single();

        if (post && post.user_id !== userId) {
          notificationService.notifySpecificUser(
            post.user_id,
            'Nova curtida! ❤️',
            `${profile?.full_name || 'Alguém'} curtiu sua postagem.`,
            { type: 'NEW_LIKE', related_id: postId, screen: 'Feed' }
          );
        }
      }
      return result;
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
    const result = await supabase
      .from('post_comments')
      .insert([{ post_id: postId, user_id: userId, content }])
      .select()
      .single();

    if (!result.error && result.data) {
      // Busca o autor do post e o nome de quem comentou
      const { data: post } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      if (post && post.user_id !== userId) {
        notificationService.notifySpecificUser(
          post.user_id,
          'Novo comentário! 💬',
          `${profile?.full_name || 'Alguém'} comentou no seu post.`,
          { type: 'NEW_COMMENT', related_id: postId, screen: 'Feed' }
        );
      }
    }

    return result;
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
