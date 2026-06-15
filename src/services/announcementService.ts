import { supabase } from './supabase';

export interface Announcement {
  id: string;
  institution_id: string;
  author_id: string;
  title: string;
  content: string;
  expires_at: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
}

export const announcementService = {
  async getActiveAnnouncements(institutionId: string | null) {
    let query = supabase
      .from('announcements')
      .select('*, profiles(full_name, avatar_url)')
      .order('created_at', { ascending: false });

    // Se tiver instituição, filtra, se não, ignora (Master)
    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching announcements:', error);
      return { data: null, error };
    }

    // Filtrar localmente os expirados (também poderia ser feito via query rpc ou > now())
    const now = new Date();
    const active = data?.filter(a => !a.expires_at || new Date(a.expires_at) > now) || [];

    return { data: active as Announcement[], error: null };
  },

  async createAnnouncement(data: {
    institution_id?: string;
    author_id: string;
    title: string;
    content: string;
    expires_at: string | null;
  }) {
    const { data: result, error } = await supabase
      .from('announcements')
      .insert([data])
      .select()
      .single();

    return { data: result, error };
  },

  async deleteAnnouncement(id: string) {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    return { error };
  }
};
