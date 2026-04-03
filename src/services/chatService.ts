import { supabase } from './supabase';

export interface ChatMessage {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

export const chatService = {
  async sendMessage(eventId: string, userId: string, content: string) {
    return await supabase
      .from('messages')
      .insert([{ event_id: eventId, user_id: userId, content }]);
  },

  async getMessages(eventId: string, limit = 50) {
    return await supabase
      .from('messages')
      .select('*, profiles(full_name)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(limit);
  },

  isChatActive(eventDate: string, windowHours: number = 4): boolean {
    const start = new Date(eventDate).getTime();
    const end = start + (windowHours * 60 * 60 * 1000);
    const now = new Date().getTime();
    return now < end;
  },

  async canUserPost(eventId: string, userId: string, role: string): Promise<boolean> {
    // Admins and Leaders can always post
    if (['ADMIN', 'LÍDER'].includes(role)) return true;

    // Others must be scheduled
    const { data } = await supabase
      .from('schedules')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    return !!data;
  }
};
