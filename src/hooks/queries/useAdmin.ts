import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, Profile, Institution } from '../../services/adminService';

export const useVolunteers = (institutionId?: string | null) => {
  return useQuery({
    queryKey: ['volunteers', institutionId],
    queryFn: async () => {
      const { data, error } = await adminService.listVolunteers(institutionId);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useDepartments = (institutionId?: string | null) => {
  return useQuery({
    queryKey: ['departments', institutionId],
    queryFn: async () => {
      const { data, error } = await adminService.listDepartments(institutionId);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useRoles = () => {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await adminService.listAllRoles();
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useLeaderDepartments = (userId?: string) => {
  return useQuery({
    queryKey: ['leaderDepartments', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await adminService.getLeaderDepartments(userId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useInviteVolunteer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, name, departmentId, institutionId }: { email: string; name: string; departmentId?: string | null; institutionId?: string | null }) => {
      const { data, error, emailError, emailSent } = await adminService.inviteVolunteer(email, name, departmentId, institutionId);
      if (error) throw error;
      return { data, emailError, emailSent };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['volunteers'] });
    },
  });
};

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, description, leaderId, coLeaderId, institutionId }: { name: string; description?: string; leaderId?: string; coLeaderId?: string | null; institutionId?: string | null }) => {
      const { data, error } = await adminService.createDepartment(name, description, leaderId, coLeaderId || undefined, institutionId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
};

export const useUpdateDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
      const { data, error } = await adminService.updateDepartment(id, name, description);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
};

export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await adminService.deleteDepartment(id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
};

export const useUpdateLeader = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ deptId, leaderId }: { deptId: string; leaderId: string }) => {
      const { data, error } = await adminService.updateDepartmentLeader(deptId, leaderId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
};

export const useUpdateCoLeader = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ deptId, coLeaderId }: { deptId: string; coLeaderId: string | null }) => {
      const { data, error } = await adminService.updateDepartmentCoLeader(deptId, coLeaderId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ deptId, name }: { deptId: string; name: string }) => {
      const { data, error } = await adminService.createDepartmentRole(deptId, name);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
};

export const useUpdateVolunteerRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: 'ADMIN' | 'LÍDER' | 'CO-LÍDER' | 'VOLUNTÁRIO' }) => {
      const { data, error } = await adminService.updateVolunteerRole(userId, newRole);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['volunteers'] });
    },
  });
};
