import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { availabilityService } from '../../services/availabilityService';
import { eventService } from '../../services/eventService';
import { scheduleService } from '../../services/scheduleService';
import { supabase } from '../../services/supabase';

// Consultas (Queries)

export const useUserDepartments = () => {
  return useQuery({
    queryKey: ['userDepartments'],
    queryFn: async () => {
      const { data, error } = await availabilityService.getUserDepartments();
      if (error) throw error;
      return data || [];
    },
  });
};

export const useUserAbsences = () => {
  return useQuery({
    queryKey: ['userAbsences'],
    queryFn: async () => {
      const { data, error } = await availabilityService.getAbsences();
      if (error) throw error;
      return data || [];
    },
  });
};

export const useUpcomingEventsByDept = (departmentId: string | null) => {
  return useQuery({
    queryKey: ['upcomingEvents', departmentId],
    queryFn: async () => {
      if (!departmentId) return [];
      const { data, error } = await eventService.listUpcomingEvents({ department_id: departmentId });
      if (error) throw error;
      return data || [];
    },
    enabled: !!departmentId,
  });
};

export const useEventAvailability = (eventIds: string[]) => {
  return useQuery({
    queryKey: ['eventAvailability', eventIds],
    queryFn: async () => {
      if (eventIds.length === 0) return [];
      const { data, error } = await availabilityService.getEventAvailability(eventIds);
      if (error) throw error;
      return data || [];
    },
    enabled: eventIds.length > 0,
  });
};

export const useTeamAvailability = (departmentId: string | null, eventIds: string[]) => {
  return useQuery({
    queryKey: ['teamAvailability', departmentId, eventIds],
    queryFn: async () => {
      if (!departmentId || eventIds.length === 0) return [];
      const { data, error } = await availabilityService.getEventAvailabilitiesForTeam(departmentId, eventIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!departmentId && eventIds.length > 0,
  });
};

export const useEventSchedules = (eventId: string | null) => {
  return useQuery({
    queryKey: ['eventSchedules', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await scheduleService.listSchedulesByEvent(eventId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!eventId,
  });
};

export const useMonthlyData = (departmentId: string | null, selectedMonth: Date | null) => {
  return useQuery({
    queryKey: ['monthlyData', departmentId, selectedMonth?.toISOString()],
    queryFn: async () => {
      if (!departmentId || !selectedMonth) return { roles: [], events: [], schedules: [] };
      
      const start = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).toISOString().split('T')[0];

      // Buscar roles
      const { data: roles, error: rolesErr } = await supabase.from('roles').select('*').eq('department_id', departmentId);
      if (rolesErr) throw rolesErr;

      // Buscar eventos no mês
      const { data: events, error: evErr } = await supabase
        .from('events')
        .select('*, event_departments!inner(*)')
        .eq('event_departments.department_id', departmentId)
        .gte('event_date', `${start}T00:00:00Z`)
        .lte('event_date', `${end}T23:59:59Z`)
        .order('event_date', { ascending: true });
      if (evErr) throw evErr;

      let schedules = [];
      if (events && events.length > 0) {
        const { data: mSchedules, error: schErr } = await supabase
          .from('schedules')
          .select('*, profiles(full_name), roles(id, name)')
          .in('event_id', events.map((e: any) => e.id));
        if (schErr) throw schErr;
        schedules = mSchedules || [];
      }

      return { roles: roles || [], events: events || [], schedules };
    },
    enabled: !!departmentId && !!selectedMonth,
  });
};

// Mutações (Mutations)

export const useUpdateAvailability = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventAvailabilities }: { eventAvailabilities: any[] }) => {
      const promises = eventAvailabilities.map(a => 
        availabilityService.updateEventAvailability(a.event_id, a.periods, a.is_available)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventAvailability'] });
      queryClient.invalidateQueries({ queryKey: ['teamAvailability'] });
    },
  });
};

export const useAddAbsence = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ startDb, endDb, description }: { startDb: string; endDb: string; description: string }) => {
      const { error } = await availabilityService.addAbsence(startDb, endDb, description);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userAbsences'] });
    },
  });
};

export const useRemoveAbsence = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (absenceId: string) => {
      const { error } = await availabilityService.removeAbsence(absenceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userAbsences'] });
    },
  });
};

export const useAutoGenerateSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, deptId, token }: { eventId: string; deptId: string; token: string | null }) => {
      const { error, data } = await scheduleService.autoGenerateSchedule(eventId, deptId, token);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['eventSchedules', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['monthlyData'] });
    },
  });
};

export const useCompleteSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await scheduleService.completeAndNotify(eventId);
      if (error) throw error;
    },
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['eventSchedules', eventId] });
      queryClient.invalidateQueries({ queryKey: ['monthlyData'] });
    },
  });
};

export const useRequestSwap = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ scheduleId, reason }: { scheduleId: string; reason: string }) => {
      const result = await scheduleService.requestSwap(scheduleId, reason);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventSchedules'] });
    },
  });
};
export const useSyncCalendar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ scheduleId, token }: { scheduleId: string; token: string }) => {
      const result = await scheduleService.syncCalendar(scheduleId, token);
      if (!result.success) throw new Error(result.error as any);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nextUserEvent'] });
    },
  });
};
