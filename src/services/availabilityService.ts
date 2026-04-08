import { supabase } from './supabase';

export interface Availability {
  id?: string;
  user_id: string;
  day_of_week: number;
  periods: string[];
  is_available: boolean;
}

export interface EventAvailability {
  id?: string;
  user_id: string;
  event_id: string;
  periods: string[];
  is_available: boolean;
}

export interface Absence {
  id?: string;
  user_id: string;
  start_date: string;
  end_date: string;
  description?: string;
}

export interface UserDepartment {
  department_id: string;
  departments: {
    id: string;
    name: string;
  };
}

export const availabilityService = {
  /**
   * Busca a disponibilidade semanal do usuário logado.
   */
  getAvailability: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not logged in' };

    const { data, error } = await supabase
      .from('user_availabilities')
      .select('*')
      .eq('user_id', user.id);

    return { data, error };
  },

  /**
   * Atualiza a disponibilidade de um dia específico.
   */
  updateAvailability: async (day_of_week: number, periods: string[], is_available: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not logged in' };

    const { data, error } = await supabase
      .from('user_availabilities')
      .upsert({
        user_id: user.id,
        day_of_week,
        periods,
        is_available,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, day_of_week' })
      .select();

    return { data, error };
  },

  /**
   * Busca os bloqueios de data (ausências) do usuário.
   */
  getAbsences: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not logged in' };

    const { data, error } = await supabase
      .from('user_absences')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: true });

    return { data, error };
  },

  /**
   * Adiciona um bloqueio de data.
   */
  addAbsence: async (start_date: string, end_date: string, description?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not logged in' };

    const { data, error } = await supabase
      .from('user_absences')
      .insert([{
        user_id: user.id,
        start_date,
        end_date,
        description
      }])
      .select();

    return { data, error };
  },

  /**
   * Remove um bloqueio de data.
   */
  removeAbsence: async (id: string) => {
    const { error } = await supabase
      .from('user_absences')
      .delete()
      .eq('id', id);

    return { error };
  },

  /**
   * Busca os departamentos vinculados ao usuário logado.
   */
  getUserDepartments: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not logged in' };

    const { data, error } = await supabase
      .from('user_departments')
      .select('department_id, departments(id, name)')
      .eq('user_id', user.id);

    // Converte de array para objeto único para facilitar o uso na UI
    const transformed = data?.map(d => ({
      department_id: d.department_id,
      departments: Array.isArray(d.departments) ? d.departments[0] : d.departments
    })) as any[];

    return { data: transformed, error };
  },

  /**
   * Busca a disponibilidade do usuário para uma lista de eventos.
   */
  getEventAvailability: async (eventIds: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not logged in' };

    const { data, error } = await supabase
      .from('user_event_availabilities')
      .select('*')
      .eq('user_id', user.id)
      .in('event_id', eventIds);

    return { data: data as EventAvailability[], error };
  },

  /**
   * Atualiza a disponibilidade de um evento específico.
   */
  updateEventAvailability: async (event_id: string, periods: string[], is_available: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: 'User not logged in' };

    const { data, error } = await supabase
      .from('user_event_availabilities')
      .upsert({
        user_id: user.id,
        event_id,
        periods,
        is_available,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, event_id' })
      .select();

    return { data, error };
  },

  /**
   * Busca a disponibilidade de TODOS os usuários de um departamento para uma lista de eventos.
   * Utilizado por Gestores para planejamento.
   */
  getEventAvailabilitiesForTeam: async (departmentId: string, eventIds: string[]) => {
    // 1. Busca os usuários do departamento
    const { data: members, error: membersError } = await supabase
      .from('user_departments')
      .select('user_id')
      .eq('department_id', departmentId);

    if (membersError || !members) return { data: [], error: membersError };

    const userIds = members.map(m => m.user_id);

    // 2. Busca disponibilidades desses usuários para os eventos
    const { data, error } = await supabase
      .from('user_event_availabilities')
      .select('*, profiles:user_id(full_name, avatar_url)')
      .in('user_id', userIds)
      .in('event_id', eventIds);

    return { data: data || [], error };
  }
};
