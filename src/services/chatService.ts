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

  isChatActive(eventDate: string, endDate?: string): boolean {
    const chatStart = new Date(eventDate).getTime() - (60 * 60 * 1000); // 1h antes
    const chatEnd = endDate 
      ? new Date(endDate).getTime() + (60 * 60 * 1000) // 1h depois do fim
      : new Date(eventDate).getTime() + (4 * 60 * 60 * 1000); // Default 4h se não houver fim
      
    const now = new Date().getTime();
    return now >= chatStart && now <= chatEnd;
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
