import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { availabilityService } from '../../services/availabilityService';

export const useUserDepartmentsProfile = () => {
  return useQuery({
    queryKey: ['userDepartmentsProfile'],
    queryFn: async () => {
      const { data, error } = await availabilityService.getUserDepartments();
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useUserInstitution = (institutionId?: string | null) => {
  return useQuery({
    queryKey: ['userInstitution', institutionId],
    queryFn: async () => {
      if (!institutionId) return null;
      const { data, error } = await supabase
        .from('institutions')
        .select('name, logo_url')
        .eq('id', institutionId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!institutionId,
    staleTime: 5 * 60 * 1000,
  });
};
