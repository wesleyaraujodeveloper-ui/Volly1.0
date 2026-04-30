import { supabase } from './supabase';

export interface PushNotification {
  to: string | string[];
  sound?: 'default' | null;
  title: string;
  body: string;
  data?: any;
}

export const notificationService = {
  /**
   * Envia uma notificação push para usuários de departamentos específicos e salva no banco
   */
  notifyDepartments: async (departmentIds: string[], title: string, body: string, data?: any) => {
    try {
      // 1. Buscar todos os tokens dos usuários nos departamentos selecionados
      const { data: profiles, error } = await supabase
        .from('user_departments')
        .select(`
          user_id,
          profiles!inner(expo_push_token)
        `)
        .in('department_id', departmentIds);

      if (error) throw error;

      if (!profiles || profiles.length === 0) {
        console.log('Nenhum usuário encontrado nestes departamentos.');
        return { success: true, count: 0 };
      }

      // 2. Filtrar tokens válidos e IDs de usuários únicos para salvar no banco
      const userIds = Array.from(new Set(profiles.map(p => p.user_id)));
      const tokens = Array.from(new Set(
        profiles
          ?.map((p: any) => p.profiles?.expo_push_token)
          .filter((t: string) => t && (t.startsWith('ExpoPushToken') || t?.startsWith('ExponentPushToken')))
      ));

      // 3. Salvar as notificações na tabela do banco de dados para a Central de Notificações
      const dbNotifications = userIds.map(userId => ({
        user_id: userId,
        title,
        body,
        type: data?.type || 'SYSTEM',
        related_id: data?.related_id || null,
        is_read: false
      }));

      await supabase.from('notifications').insert(dbNotifications);

      // 4. Enviar para a API da Expo (Push Notification)
      if (tokens.length > 0) {
        const messages = tokens.map(token => ({
          to: token,
          sound: 'default',
          title,
          body,
          data: data || {},
        }));

        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messages),
        });
      }

      return { success: true, count: userIds.length };
    } catch (error) {
      console.error('Erro ao processar notificações:', error);
      return { success: false, error };
    }
  },

  notifyNewEvent: async (eventTitle: string, eventId: string, departmentIds: string[]) => {
    return notificationService.notifyDepartments(
      departmentIds,
      'Novo Evento Criado! 📅',
      `O evento "${eventTitle}" foi agendado. Preencha sua escala!`,
      { type: 'NEW_EVENT', related_id: eventId, screen: 'Escalas' }
    );
  },

  /**
   * Envia uma notificação para todos os usuários cadastrados
   */
  notifyAllUsers: async (title: string, body: string, data?: any) => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, expo_push_token');

      if (error) throw error;
      if (!profiles || profiles.length === 0) return { success: true, count: 0 };

      const userIds = profiles.map(p => p.id);
      const tokens = profiles
        .map(p => p.expo_push_token)
        .filter(t => t && (t.startsWith('ExpoPushToken') || t?.startsWith('ExponentPushToken')));

      // Salva no banco
      const dbNotifications = userIds.map(userId => ({
        user_id: userId,
        title,
        body,
        type: data?.type || 'SYSTEM',
        related_id: data?.related_id || null,
        is_read: false
      }));

      await supabase.from('notifications').insert(dbNotifications);

      // Envia Push
      if (tokens.length > 0) {
        const messages = tokens.map(token => ({
          to: token,
          sound: 'default',
          title,
          body,
          data: data || {},
        }));

        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messages),
        });
      }

      return { success: true, count: userIds.length };
    } catch (error) {
      console.error('Erro ao notificar todos:', error);
      return { success: false, error };
    }
  },

  /**
   * Envia uma notificação para um usuário específico
   */
  notifySpecificUser: async (userId: string, title: string, body: string, data?: any) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('expo_push_token')
        .eq('id', userId)
        .single();

      if (error || !profile) throw error || new Error('Perfil não encontrado');

      // Salva no banco
      await supabase.from('notifications').insert([{
        user_id: userId,
        title,
        body,
        type: data?.type || 'SYSTEM',
        related_id: data?.related_id || null,
        is_read: false
      }]);

      // Envia Push se tiver token
      const token = profile.expo_push_token;
      if (token && (token.startsWith('ExpoPushToken') || token?.startsWith('ExponentPushToken'))) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: token,
            sound: 'default',
            title,
            body,
            data: data || {},
          }),
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao notificar usuário:', error);
      return { success: false, error };
    }
  },

  /**
   * Busca as notificações do usuário (Inbox)
   */
  getUserNotifications: async (userId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    return { data, error };
  },

  /**
   * Marca uma notificação específica como lida
   */
  markAsRead: async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    return { error };
  },

  /**
   * Marca todas as notificações do usuário como lidas
   */
  markAllAsRead: async (userId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    return { error };
  },

  /**
   * Retorna a contagem de mensagens não lidas
   */
  getUnreadCount: async (userId: string) => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    return { count: count || 0, error };
  }
};
