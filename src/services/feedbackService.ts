import { supabase } from './supabase';

export interface Feedback {
  id?: string;
  event_id: string;
  user_id: string;
  rating: number; // 1 a 5
  comment?: string;
  created_at?: string;
}

export const feedbackService = {
  async submitFeedback(data: Feedback) {
    const { data: result, error } = await supabase
      .from('feedbacks')
      .insert([data])
      .select()
      .single();

    return { data: result, error };
  },

  /**
   * Verifica se há um evento nos últimos 7 dias em que o usuário foi escalado, 
   * mas ainda não deu feedback. Retorna o evento se existir.
   */
  async getPendingFeedbackEvent(userId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const now = new Date();

    // Buscar escalas do usuário nos últimos 7 dias que já passaram
    const { data: schedules, error } = await supabase
      .from('schedules')
      .select(`
        event_id,
        status,
        events!inner (
          id,
          title,
          event_date,
          end_date,
          department_id
        )
      `)
      .eq('user_id', userId)
      .gte('events.event_date', sevenDaysAgo.toISOString())
      .lte('events.event_date', now.toISOString())
      .neq('status', 'AUSENTE')
      .order('events.event_date', { ascending: false });

    if (error || !schedules || schedules.length === 0) {
      return { data: null, error };
    }

    // Agora vamos filtrar aqueles que já terminaram
    // Se tiver end_date, tem que ser menor que o NOW. Se não, consideramos event_date + 4 horas
    const pastSchedules = schedules.filter(sch => {
      const event: any = sch.events;
      if (!event) return false;
      const end = event.end_date ? new Date(event.end_date) : new Date(new Date(event.event_date).getTime() + 4 * 60 * 60 * 1000);
      return end < now;
    });

    if (pastSchedules.length === 0) return { data: null, error: null };

    // Pegar apenas os IDs dos eventos
    const eventIds = pastSchedules.map((sch: any) => sch.event_id);

    // Verificar quais destes o usuário JÁ deu feedback
    const { data: existingFeedbacks } = await supabase
      .from('feedbacks')
      .select('event_id')
      .eq('user_id', userId)
      .in('event_id', eventIds);

    const feedbackEventIds = existingFeedbacks?.map(f => f.event_id) || [];

    // Encontrar o primeiro que NÃO tem feedback
    const pendingSchedule = pastSchedules.find(sch => !feedbackEventIds.includes(sch.event_id));

    if (pendingSchedule) {
      return { data: pendingSchedule.events, error: null };
    }

    return { data: null, error: null };
  },

  async getEventFeedbacks(eventId: string) {
    const { data, error } = await supabase
      .from('feedbacks')
      .select('*, profiles(full_name, avatar_url)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    return { data, error };
  }
};
