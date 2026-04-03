import { supabase } from './supabase';
import { addWeeks, addMonths, format } from 'date-fns';

export interface Event {
  id?: string;
  title: string;
  description?: string;
  event_date: string;
  department_id?: string;
  chat_window_hours?: number;
  created_at?: string;
  updated_at?: string;
}

export const eventService = {
  /**
   * Cria um novo evento.
   */
  createEvent: async (event: Event) => {
    const { data, error } = await supabase
      .from('events')
      .insert([event])
      .select();

    return { data, error };
  },

  /**
   * Lista os próximos eventos com filtros de busca.
   */
  listUpcomingEvents: async (filters?: { name?: string; department_id?: string; date?: string }) => {
    let query = supabase
      .from('events')
      .select('*, departments(name)')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true });

    if (filters?.name) {
      query = query.ilike('title', `%${filters.name}%`);
    }

    if (filters?.department_id) {
      query = query.eq('department_id', filters.department_id);
    }

    if (filters?.date) {
      query = query.gte('event_date', `${filters.date}T00:00:00Z`).lte('event_date', `${filters.date}T23:59:59Z`);
    }

    const { data, error } = await query;
    return { data, error };
  },

  /**
   * Histórico de eventos passados.
   */
  listPastEvents: async (limit: number = 10) => {
    const { data, error } = await supabase
      .from('events')
      .select('*, departments(name)')
      .lt('event_date', new Date().toISOString())
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
      .select('*, departments(name)')
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
