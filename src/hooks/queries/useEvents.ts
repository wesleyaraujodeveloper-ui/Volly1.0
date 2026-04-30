import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService, Event } from '../../services/eventService';

export const useUpcomingEventsList = (filters?: { name?: string; department_id?: string; date?: string; institutionId?: string | null }) => {
  return useQuery({
    queryKey: ['upcomingEventsList', filters],
    queryFn: async () => {
      const { data, error } = await eventService.listUpcomingEvents(filters);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const usePastEventsList = (limit: number = 10, institutionId?: string | null) => {
  return useQuery({
    queryKey: ['pastEventsList', limit, institutionId],
    queryFn: async () => {
      const { data, error } = await eventService.listPastEvents(limit, institutionId);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useEventDetails = (eventId: string | null) => {
  return useQuery({
    queryKey: ['eventDetails', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data, error } = await eventService.getEventDetails(eventId);
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateEvents = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (events: Event[]) => {
      const { data, error } = await eventService.createEvents(events);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcomingEventsList'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingEvents'] }); // from useSchedules
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, event }: { id: string, event: Partial<Event> }) => {
      const { data, error } = await eventService.updateEvent(id, event);
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['upcomingEventsList'] });
      queryClient.invalidateQueries({ queryKey: ['eventDetails', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['upcomingEvents'] }); 
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await eventService.deleteEvent(id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcomingEventsList'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingEvents'] });
    },
  });
};

export const useCopyEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, newDate }: { eventId: string, newDate: string }) => {
      const { data, error } = await eventService.copyEvent(eventId, newDate);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcomingEventsList'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingEvents'] });
    },
  });
};
