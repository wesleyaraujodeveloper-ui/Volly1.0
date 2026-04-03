import { supabase } from './supabase';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface Schedule {
  id?: string;
  event_id: string;
  user_id: string;
  role_id: string;
  status: 'PENDENTE' | 'CONFIRMADO' | 'AUSENTE';
  created_at?: string;
  updated_at?: string;
}

export const scheduleService = {
  /**
   * Atribui um voluntário a um evento.
   */
  assignVolunteer: async (schedule: Schedule) => {
    const { data, error } = await supabase
      .from('schedules')
      .upsert([schedule], { onConflict: 'event_id, user_id' })
      .select();

    return { data, error };
  },

  /**
   * Remove um voluntário da escala de um evento.
   */
  removeSchedule: async (id: string) => {
    const { error } = await supabase.from('schedules').delete().eq('id', id);
    return { error };
  },

  /**
   * Retorna os voluntários do departamento com o contador de escalas no mês.
   */
  getVolunteerBalancing: async (departmentId: string, targetDate: string) => {
    const start = startOfMonth(new Date(targetDate)).toISOString();
    const end = endOfMonth(new Date(targetDate)).toISOString();

    // 1. Buscar todos os voluntários do departamento
    const { data: volunteers, error: volErr } = await supabase
      .from('user_departments')
      .select('user_id, profiles(full_name, email)')
      .eq('department_id', departmentId);

    if (volErr) return { error: volErr };

    // 2. Contar as escalas de cada voluntário no mês alvo
    const { data: monthlySchedules, error: schErr } = await supabase
      .from('schedules')
      .select('user_id, events!inner(event_date)')
      .gte('events.event_date', start)
      .lte('events.event_date', end);

    if (schErr) return { error: schErr };

    // 3. Montar o ranking de balanceamento
    const balancing = volunteers.map(v => {
      const count = monthlySchedules.filter(s => s.user_id === v.user_id).length;
      return {
        id: v.user_id,
        name: (v.profiles as any)?.full_name || (v.profiles as any)?.email,
        count,
      };
    });

    // Ordenar por quem tem menos escalas (balanceamento)
    return { data: balancing.sort((a, b) => a.count - b.count) };
  },

  /**
   * Retorna a lista de escalas de um evento com detalhes de usuário e função.
   */
  listSchedulesByEvent: async (eventId: string) => {
    const { data, error } = await supabase
      .from('schedules')
      .select('*, profiles(full_name, email, avatar_url), roles(name)')
      .eq('event_id', eventId);

    return { data, error };
  }
};
