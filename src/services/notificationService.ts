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
   * Envia uma notificação push para usuários de departamentos específicos
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

      // 2. Filtrar tokens válidos e únicos
      const tokens = Array.from(new Set(
        profiles
          ?.map((p: any) => p.profiles?.expo_push_token)
          .filter((t: string) => t && t.startsWith('ExporterPushToken') || t?.startsWith('ExponentPushToken'))
      ));

      if (tokens.length === 0) {
        console.log('Nenhum dispositivo registrado para receber notificações nestes departamentos.');
        return { success: true, count: 0 };
      }

      // 3. Enviar para a API da Expo (Broadcast)
      // Nota: Em produção, o ideal é usar uma Edge Function, mas para v0.1 faremos via client
      const messages = tokens.map(token => ({
        to: token,
        sound: 'default',
        title,
        body,
        data: data || {},
      }));

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const resData = await response.json();
      console.log('Notificações enviadas:', resData);

      return { success: true, count: tokens.length };
    } catch (error) {
      console.error('Erro ao enviar notificações:', error);
      return { success: false, error };
    }
  },

  /**
   * Atalho específico para criação de eventos
   */
  notifyNewEvent: async (eventTitle: string, departmentIds: string[]) => {
    return notificationService.notifyDepartments(
      departmentIds,
      'Novo Evento Criado! 📅',
      `O evento "${eventTitle}" foi agendado. Preencha sua escala!`,
      { screen: 'Escalas' }
    );
  }
};
