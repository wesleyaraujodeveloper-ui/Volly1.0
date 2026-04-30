import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services/adminService';

export const useAllInstitutions = () => {
  return useQuery({
    queryKey: ['institutionsList'],
    queryFn: async () => {
      const { data, error } = await adminService.listInstitutions();
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useInstitutionAdmins = (institutionId: string | null) => {
  return useQuery({
    queryKey: ['institutionAdmins', institutionId],
    queryFn: async () => {
      if (!institutionId) return [];
      const { data, error } = await adminService.listInstitutionAdmins(institutionId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!institutionId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateInstitution = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, slug, userLimit, logoUrl, adminEmail }: { name: string; slug: string; userLimit?: number; logoUrl?: string | null; adminEmail?: string | null }) => {
      const { data, error } = await adminService.createInstitution(name, slug, userLimit, logoUrl, adminEmail);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutionsList'] });
    },
  });
};

export const useUpdateInstitution = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await adminService.updateInstitution(id, updates);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institutionsList'] });
    },
  });
};
