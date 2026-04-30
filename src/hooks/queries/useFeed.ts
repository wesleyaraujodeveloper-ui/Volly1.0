import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedService } from '../../services/feedService';
import { useAppStore } from '../../store/useAppStore';

// Hooks para consultas (Queries)
export const useFeedPosts = (institutionId: string | null) => {
  return useQuery({
    queryKey: ['feedPosts', institutionId],
    queryFn: async () => {
      const { data, error } = await feedService.listPosts(institutionId);
      if (error) throw error;
      return data || [];
    },
  });
};

export const useGlobalSchedulePanorama = (institutionId: string | null) => {
  return useQuery({
    queryKey: ['panorama', institutionId],
    queryFn: async () => {
      const { data, error } = await feedService.getGlobalSchedulePanorama(institutionId);
      if (error) throw error;
      return data || [];
    },
  });
};

export const useNextUserEvent = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['nextUserEvent', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await feedService.getNextUserEvent(userId);
      if (error && error.message !== 'Nenhum evento futuro encontrado.') throw error;
      return data;
    },
    enabled: !!userId,
  });
};

export const useNextGlobalEvent = (institutionId: string | null) => {
  return useQuery({
    queryKey: ['nextGlobalEvent', institutionId],
    queryFn: async () => {
      const { data, error } = await feedService.getNextGlobalEvent(institutionId);
      if (error && error.message !== 'Nenhum evento global futuro encontrado.') throw error;
      return data;
    },
  });
};

export const useRecommendedSongs = (limit: number = 10) => {
  return useQuery({
    queryKey: ['recommendedSongs', limit],
    queryFn: async () => {
      const { data, error } = await feedService.getRecommendedSongs(limit);
      if (error) throw error;
      return data || [];
    },
  });
};

// Hooks para mutações (Mutations)
export const useCreatePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, content, imageUrl, institutionId, visibility }: { userId: string; content: string; imageUrl?: string; institutionId?: string; visibility: 'INTERNAL' | 'GLOBAL' }) => {
      const { data, error } = await feedService.createPost(userId, content, imageUrl, institutionId, visibility);
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feedPosts'] });
    },
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await feedService.deletePost(postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedPosts'] });
    },
  });
};

export const useToggleLike = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, userId }: { postId: string; userId: string }) => {
      const { error } = await feedService.toggleLike(postId, userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedPosts'] });
    },
  });
};
