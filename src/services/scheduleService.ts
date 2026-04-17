import { supabase } from './supabase';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { calendarService } from './calendarService';
import { notificationService } from './notificationService';

export interface Schedule {
  id?: string;
  event_id: string;
  user_id: string;
  role_id: string;
  status: 'PENDENTE' | 'CONFIRMADO' | 'AUSENTE' | 'TROCA_SOLICITADA';
  swap_reason?: string;
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
      .upsert([{ ...schedule, google_event_id, swap_reason: null }], { onConflict: 'event_id, user_id' })
      .select('*, events(title)');

    // Notificar o voluntário que ele foi escalado
    if (!error && data && data.length > 0) {
      const eventTitle = (data[0] as any).events?.title || 'Novo Evento';
      notificationService.notifySpecificUser(
        schedule.user_id,
        'Você foi Escalado! 📅',
        `Você foi selecionado para participar do evento "${eventTitle}". Clique para conferir!`,
        { type: 'NEW_SCHEDULE', related_id: schedule.event_id, screen: 'Escalas' }
      );
    }

    return { data, error };
  },

  /**
   * Solicita a troca de uma escala (Voluntário -> Líder).
   */
  requestSwap: async (scheduleId: string, reason: string = '') => {
    try {
      // 1. Pegar detalhes da escala e do evento para a notificação
      const { data: sch, error: schErr } = await supabase
        .from('schedules')
        .select('*, profiles(full_name), events(title, department_id, event_departments(department_id))')
        .eq('id', scheduleId)
        .single();

      if (schErr || !sch) throw schErr || new Error('Escala não encontrada');

      // 2. Atualizar status da escala
      const { error: updateErr } = await supabase
        .from('schedules')
        .update({ 
          status: 'TROCA_SOLICITADA', 
          swap_reason: reason.trim() || 'Motivo não informado' 
        })
        .eq('id', scheduleId);

      if (updateErr) throw updateErr;

      // 3. Notificar Líderes e Co-Líderes do departamento
      // Buscamos os IDs dos depto vinculados
      const deptIds = sch.events?.event_departments?.map((ed: any) => ed.department_id) || [];
      if (sch.events?.department_id) deptIds.push(sch.events.department_id);

      if (deptIds.length > 0) {
        // Buscar líderes desses departamentos
        const { data: leaders } = await supabase
          .from('departments')
          .select('leader_id, co_leader_id')
          .in('id', deptIds);

        const leaderIds = new Set<string>();
        leaders?.forEach(l => {
          if (l.leader_id) leaderIds.add(l.leader_id);
          if (l.co_leader_id) leaderIds.add(l.co_leader_id);
        });

        // Notificar cada líder
        const volunteerName = sch.profiles?.full_name || 'Um voluntário';
        const eventTitle = sch.events?.title || 'evento';
        
        for (const leaderId of Array.from(leaderIds)) {
          await notificationService.notifySpecificUser(
            leaderId,
            'Solicitação de Troca 🔄',
            `${volunteerName} solicitou troca no evento "${eventTitle}". Motivo: ${reason || 'Não informado'}`,
            { type: 'SWAP_REQUEST', related_id: sch.event_id, screen: 'Escalas' }
          );
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error requestSwap:', error);
      return { success: false, error: error.message };
    }
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
      // monthlySchedules pode vir com eventos como objeto ou array dependendo da versão do postgrest/join
      const count = monthlySchedules?.filter(s => s.user_id === v.user_id).length || 0;
      return {
        id: v.user_id,
        name: (v.profiles as any)?.full_name || (v.profiles as any)?.email || 'Voluntário',
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

    // 3. Pegar TODAS as respostas de disponibilidade para este evento
    const { data: availables, error: availErr } = await supabase
      .from('user_event_availabilities')
      .select('user_id, is_available')
      .eq('event_id', eventId);
    
    if (availErr) return { error: `Erro ao buscar disponibilidades: ${availErr.message}` };
    
    const explicitlyAvailableIds = availables?.filter(a => a.is_available === true).map(a => a.user_id) || [];
    const explicitlyUnavailableIds = availables?.filter(a => a.is_available === false).map(a => a.user_id) || [];

    // 4. Pegar dados do evento para o balanceamento e verificação de conflitos
    const { data: event, error: evErr } = await supabase
      .from('events')
      .select('event_date, end_date')
      .eq('id', eventId)
      .single();
    
    if (evErr || !event) return { error: 'Erro ao localizar dados do evento.' };

    // 4.1 Definir intervalo do evento atual (duração padrão de 2h se não houver end_date)
    const currentStart = new Date(event.event_date);
    const currentEnd = event.end_date 
      ? new Date(event.end_date) 
      : new Date(currentStart.getTime() + 2 * 60 * 60 * 1000);

    // 4.2 Buscar TODAS as escalas do dia para verificar sobreposição (qualquer equipe)
    const startOfDay = new Date(currentStart);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentStart);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: daySchedules } = await supabase
      .from('schedules')
      .select('user_id, status, events!inner(event_date, end_date)')
      .gte('events.event_date', startOfDay.toISOString())
      .lte('events.event_date', endOfDay.toISOString())
      .in('status', ['PENDENTE', 'CONFIRMADO']);

    const conflictedUserIds = daySchedules?.filter(s => {
      const startB = new Date((s.events as any).event_date);
      const endB = (s.events as any).end_date 
        ? new Date((s.events as any).end_date) 
        : new Date(startB.getTime() + 2 * 60 * 60 * 1000);
      
      // Lógica de intersecção: (StartA < EndB) E (StartB < EndA)
      return currentStart < endB && startB < currentEnd;
    }).map(s => s.user_id) || [];

    // 5. Pegar balanceamento mensal dos voluntários
    const { data: balancing, error: balErr } = await scheduleService.getVolunteerBalancing(departmentId, event.event_date);
    if (balErr || !balancing) return { error: 'Erro ao calcular balanceamento da equipe.' };

    const results = [];
    
    // Lista de IDs de usuários já escalados neste evento ou em eventos conflitantes
    const assignedUserIds = new Set([
      ...(existing?.map(s => s.user_id) || []),
      ...conflictedUserIds
    ]);

    for (const role of roles) {
      if (existingRoleIds.includes(role.id)) continue; 

      // Candidatos que confirmaram expressamente (Prioridade 1)
      let candidate = balancing.find(b => 
        explicitlyAvailableIds.includes(b.id) && !assignedUserIds.has(b.id)
      );

      // Se não tem ninguém prioritário, buscar omissos (Prioridade 2 = Fallback)
      if (!candidate) {
        candidate = balancing.find(b => 
          !explicitlyAvailableIds.includes(b.id) && 
          !explicitlyUnavailableIds.includes(b.id) && 
          !assignedUserIds.has(b.id)
        );
      }

      if (candidate) {
        const { data, error: assignErr } = await scheduleService.assignVolunteer({
          event_id: eventId,
          user_id: candidate.id,
          role_id: role.id,
          status: 'PENDENTE'
        }, providerToken);
        
        if (data) {
          results.push(data);
          assignedUserIds.add(candidate.id); // Marca como ocupado para a próxima função
          candidate.count++;
          balancing.sort((a, b) => a.count - b.count);
        } else if (assignErr) {
          console.error(`Erro ao escalar ${candidate.name}:`, assignErr);
        }
      }
    }

    if (results.length === 0) {
      return { error: 'As funções já estão preenchidas ou não há mais voluntários escaláveis (todos ocupados ou indisponíveis).' };
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
