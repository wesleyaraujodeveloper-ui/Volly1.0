import { supabase } from './supabase';
import { addWeeks, addMonths, format } from 'date-fns';

export interface Event {
  id?: string;
  title: string;
  description?: string;
  event_date: string;
  end_date?: string; // Novo campo para horário de término
  department_id?: string;
  department_ids?: string[];
  chat_window_hours?: number;
  created_at?: string;
  updated_at?: string;
  // Campo de retorno virtual
  event_departments?: { departments: { name: string, id: string } }[];
}

export const eventService = {
  /**
   * Cria múltiplos eventos (um por data) ou evento único.
   */
  createEvents: async (events: Event[]) => {
    const results = [];
    for (const event of events) {
      const { department_ids, ...rest } = event;
      const eventData = { 
        ...rest, 
        department_id: department_ids && department_ids.length > 0 ? department_ids[0] : undefined 
      };
      
      // 1. Inserir Evento
      const { data: newEvent, error: eventErr } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();
      
      if (eventErr) return { error: eventErr };

      // 2. Junção de departamentos
      if (department_ids && department_ids.length > 0) {
        const junctionData = department_ids.map(deptId => ({
          event_id: newEvent.id,
          department_id: deptId
        }));
        await supabase.from('event_departments').insert(junctionData);
      }
      results.push(newEvent);
    }
    return { data: results, error: null };
  },

  updateEvent: async (id: string, event: Partial<Event>) => {
    const { department_ids, ...eventData } = event;
    const { data, error } = await supabase
      .from('events')
      .update(eventData)
      .eq('id', id)
      .select()
      .single();

    if (error) return { error };

    if (department_ids) {
      // Atualiza departamentos (delete + insert)
      await supabase.from('event_departments').delete().eq('event_id', id);
      const junctionData = department_ids.map(deptId => ({
        event_id: id,
        department_id: deptId
      }));
      await supabase.from('event_departments').insert(junctionData);
    }

    return { data, error };
  },

  deleteEvent: async (id: string) => {
    return await supabase.from('events').delete().eq('id', id);
  },

  listHistory: async (startDate: string, endDate: string, institutionId?: string | null) => {
    let query = supabase
      .from('events')
      .select('*, event_departments(departments(id, name))')
      .gte('event_date', `${startDate}T00:00:00Z`)
      .lte('event_date', `${endDate}T23:59:59Z`);

    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }

    const { data, error } = await query.order('event_date', { ascending: false });
    return { data, error };
  },

  /**
   * Lista os próximos eventos com filtros de busca e isolamento institucional.
   */
  listUpcomingEvents: async (filters?: { name?: string; department_id?: string; date?: string; institutionId?: string | null }) => {
    let eventIds: string[] = [];

    // 1. Se filtrar por departamento, busca os IDs na tabela de junção primeiro
    if (filters?.department_id) {
      const { data: junctionData } = await supabase
        .from('event_departments')
        .select('event_id')
        .eq('department_id', filters.department_id);
      
      if (junctionData) {
        eventIds = junctionData.map(ed => ed.event_id);
      }
    }

    // 2. Monta a query principal
    let query = supabase
      .from('events')
      .select('*, event_departments(departments(id, name))');

    // Filtro institucional
    if (filters?.institutionId) {
      query = query.eq('institution_id', filters.institutionId);
    }

    // Se NÃO houver data específica, filtramos apenas os próximos
    if (!filters?.date) {
      query = query.gte('event_date', new Date().toISOString());
    }

    query = query.order('event_date', { ascending: true });

    if (filters?.name) {
      query = query.ilike('title', `%${filters.name}%`);
    }

    if (filters?.department_id) {
      // Filtra por ID principal OU IDs encontrados na junção
      if (eventIds.length > 0) {
        query = query.or(`department_id.eq.${filters.department_id},id.in.(${eventIds.join(',')})`);
      } else {
        query = query.eq('department_id', filters.department_id);
      }
    }

    if (filters?.date) {
      const [y, m, d] = filters.date.split('-').map(Number);
      const startOfDay = new Date(y, m - 1, d, 0, 0, 0).toISOString();
      const endOfDay = new Date(y, m - 1, d, 23, 59, 59).toISOString();
      query = query.gte('event_date', startOfDay).lte('event_date', endOfDay);
    }

    const { data, error } = await query;
    return { data, error };
  },

  /**
   * Histórico de eventos passados.
   */
  listPastEvents: async (limit: number = 10, institutionId?: string | null) => {
    let query = supabase
      .from('events')
      .select('*, event_departments(departments(id, name))')
      .lt('event_date', new Date().toISOString());

    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }

    const { data, error } = await query
      .order('event_date', { ascending: false })
      .limit(limit);

    return { data, error };
  },

  /**
   * Detalhes de um evento único com sua playlist.
   */
  getEventDetails: async (eventId: string) => {
    const { data, error } = await supabase
      .from('events')
      .select('*, event_departments(departments(id, name))')
      .eq('id', eventId)
      .single();

    return { data, error };
  },

  /**
   * Duplica um evento e sua estrutura de mídias (playlist).
   */
  copyEvent: async (eventId: string, newDate: string) => {
    // 1. Buscar o evento original
    const { data: original, error: fetchErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (fetchErr) return { error: fetchErr };

    // 2. Inserir clone com nova data
    const { data: newEvent, error: createErr } = await supabase
      .from('events')
      .insert([{
        title: original.title,
        description: original.description,
        department_id: original.department_id,
        event_date: newDate,
        chat_window_hours: original.chat_window_hours
      }])
      .select()
      .single();

    if (createErr) return { error: createErr };

    // 3. Clonar playlist
    const { data: playlists } = await supabase
      .from('playlists')
      .select('*')
      .eq('event_id', eventId);
    
    if (playlists && playlists.length > 0) {
      const clones = playlists.map(p => ({
        event_id: newEvent.id,
        name: p.name,
        links: p.links
      }));
      await supabase.from('playlists').insert(clones);
    }

    return { data: newEvent };
  },

  /**
   * Gera eventos recorrentes (semanal ou mensal).
   */
  createRecurringEvents: async (baseEvent: Event, type: 'SEMANAL' | 'MENSAL', count: number) => {
    const eventsToCreate: Event[] = [];
    const startDate = new Date(baseEvent.event_date);

    for (let i = 0; i < count; i++) {
      let nextDate: Date;
      if (type === 'SEMANAL') {
        nextDate = addWeeks(startDate, i);
      } else {
        nextDate = addMonths(startDate, i);
      }

      eventsToCreate.push({
        title: baseEvent.title,
        description: baseEvent.description,
        department_id: baseEvent.department_id,
        event_date: nextDate.toISOString(),
        chat_window_hours: baseEvent.chat_window_hours
      });
    }

    const { data, error } = await supabase.from('events').insert(eventsToCreate).select();
    return { data, error };
  }
};
