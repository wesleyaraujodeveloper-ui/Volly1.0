import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';

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
    const chatStart = new Date(eventDate).getTime() - (2 * 60 * 60 * 1000); // 2h antes
    const chatEnd = endDate 
      ? new Date(endDate).getTime() + (60 * 60 * 1000) // 1h depois do fim
      : new Date(eventDate).getTime() + (4 * 60 * 60 * 1000); // Default 4h se não houver fim
      
    const now = new Date().getTime();
    return now >= chatStart && now <= chatEnd;
  },

  async canUserPost(eventId: string, userId: string, role: string): Promise<boolean> {
    // Admins and Leaders can always post
    if (['MASTER', 'ADMIN', 'LÍDER', 'CO-LÍDER'].includes(role)) return true;

    // Others must be scheduled
    const { data } = await supabase
      .from('schedules')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    return !!data;
  },

  async downloadChatHistory(eventId: string, eventTitle: string) {
    try {
      // 1. Buscar todas as mensagens com nomes
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*, profiles(full_name)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!messages || messages.length === 0) {
        throw new Error('Não há mensagens para exportar neste evento.');
      }

      // 2. Formatar o conteúdo
      let content = `HISTÓRICO DE CHAT - ${eventTitle.toUpperCase()}\n`;
      content += `Exportado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}\n`;
      content += '--------------------------------------------------\n\n';

      messages.forEach(msg => {
        const time = format(new Date(msg.created_at), 'HH:mm');
        const user = msg.profiles?.full_name || 'Usuário';
        content += `[${time}] ${user}: ${msg.content}\n`;
      });

      // 3. Salvar em arquivo temporário
      const fileName = `chat_${eventId.substring(0, 8)}.txt`;
      const fileUri = (FileSystem as any).cacheDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: (FileSystem as any).EncodingType.UTF8,
      });

      // 4. Compartilhar
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: `Baixar histórico: ${eventTitle}`,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Erro ao exportar chat:', error);
      return { success: false, error: error.message };
    }
  }
};
