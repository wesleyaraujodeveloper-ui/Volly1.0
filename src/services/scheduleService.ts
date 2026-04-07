import { supabase } from './supabase';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { calendarService } from './calendarService';

export interface Schedule {
  id?: string;
  event_id: string;
  user_id: string;
  role_id: string;
  status: 'PENDENTE' | 'CONFIRMADO' | 'AUSENTE';
  google_event_id?: string;
  created_at?: string;
  updated_at?: string;
}

export const scheduleService = {
  /**
   * Atribui um voluntário a um evento.
   */
  assignVolunteer: async (schedule: Schedule, providerToken?: string | null) => {
    let google_event_id = schedule.google_event_id;

    if (providerToken && !google_event_id) {
      try {
        const { data: ev } = await supabase.from('events').select('*').eq('id', schedule.event_id).single();
        if (ev) {
          const startTime = new Date(ev.event_date);
          const endTime = new Date(startTime.getTime() + (ev.chat_window_hours * 60 * 60 * 1000));
          
          const gEvent = await calendarService.addEventToCalendar(
            providerToken,
            ev.title,
            ev.description || '',
            startTime.toISOString(),
            endTime.toISOString()
          );
          if (gEvent && gEvent.id) {
            google_event_id = gEvent.id;
          }
        }
      } catch (err) {
        console.error('Google Calendar Add Error:', err);
      }
    }

    const { data, error } = await supabase
      .from('schedules')
      .upsert([{ ...schedule, google_event_id }], { onConflict: 'event_id, user_id' })
      .select();

    return { data, error };
  },

  /**
   * Remove um voluntário da escala de um evento.
   */
  removeSchedule: async (id: string, providerToken?: string | null) => {
    if (providerToken) {
      try {
        const { data: sch } = await supabase.from('schedules').select('google_event_id').eq('id', id).single();
        if (sch && sch.google_event_id) {
          await calendarService.removeEventFromCalendar(providerToken, sch.google_event_id);
        }
      } catch (err) {
        console.error('Google Calendar Remove Error:', err);
      }
    }

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
  },

  /**
   * Gera escalas automaticamente para um evento e departamento.
   */
  autoGenerateSchedule: async (eventId: string, departmentId: string, providerToken?: string | null) => {
    // 1. Pegar todas as funções do departamento
    const { data: roles, error: rolesErr } = await supabase.from('roles').select('*').eq('department_id', departmentId);
    if (rolesErr) return { error: `Erro ao buscar funções: ${rolesErr.message}` };
    if (!roles || roles.length === 0) return { error: 'Nenhuma função encontrada para este departamento. Cadastre as funções primeiro.' };

    // 2. Pegar escalas existentes (para não sobrescrever)
    const { data: existing } = await scheduleService.listSchedulesByEvent(eventId);
    const existingRoleIds = existing?.map(s => s.role_id) || [];

    // 3. Pegar voluntários disponíveis para este evento
    const { data: availables, error: availErr } = await supabase
      .from('user_event_availabilities')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('is_available', true);
    
    if (availErr) return { error: `Erro ao buscar disponibilidades: ${availErr.message}` };
    if (!availables || availables.length === 0) return { error: 'Nenhum voluntário marcou disponibilidade para este evento.' };
    const availableUserIds = availables.map(a => a.user_id);

    // 4. Pegar dados do evento para o balanceamento
    const { data: event, error: evErr } = await supabase.from('events').select('event_date').eq('id', eventId).single();
    if (evErr || !event) return { error: 'Erro ao localizar dados do evento.' };

    // 5. Pegar balanceamento mensal dos voluntários
    const { data: balancing, error: balErr } = await scheduleService.getVolunteerBalancing(departmentId, event.event_date);
    if (balErr || !balancing) return { error: 'Erro ao calcular balanceamento da equipe.' };

    const results = [];
    for (const role of roles) {
      if (existingRoleIds.includes(role.id)) continue; 

      // Encontrar voluntário disponível para este evento que esteja no ranking de balanceamento
      const candidate = balancing.find(b => availableUserIds.includes(b.id));

      if (candidate) {
        const { data, error: assignErr } = await scheduleService.assignVolunteer({
          event_id: eventId,
          user_id: candidate.id,
          role_id: role.id,
          status: 'PENDENTE'
        }, providerToken);
        
        if (data) {
          results.push(data);
          candidate.count++;
          balancing.sort((a, b) => a.count - b.count);
        }
      }
    }

    if (results.length === 0) {
      return { error: 'As funções já estão preenchidas ou não há voluntários disponíveis para as funções restantes.' };
    }

    return { data: results };
  },

  /**
   * Conclui a escala e altera o status de PENDENTE para CONFIRMADO.
   */
  completeAndNotify: async (eventId: string) => {
    const { data, error } = await supabase
      .from('schedules')
      .update({ status: 'CONFIRMADO' })
      .eq('event_id', eventId)
      .eq('status', 'PENDENTE')
      .select();

    // Aqui no futuro dispararíamos push/email via Edge Function
    return { data, error };
  }
};
