import { supabase } from './supabase';

export interface Profile {
  id?: string;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'LÍDER' | 'CO-LÍDER' | 'VOLUNTÁRIO';
  name?: string;
  created_at?: string;
  teams?: string[];
  institution_id?: string | null;
}

export interface Institution {
  id: string;
  name: string;
  slug: string;
  user_limit: number;
  logo_url: string | null;
  active: boolean;
  created_at: string;
  userCount?: number;
}

export const adminService = {
  /**
   * Registra um novo voluntário na tabela de convites (invitations).
   */
  inviteVolunteer: async (email: string, name: string = '', departmentId?: string | null, institutionId?: string | null) => {
    const cleanEmail = email.toLowerCase().trim();

    // 1. Verifica se já não é um membro ativo
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingProfile) {
      return { data: null, error: { message: 'Voluntário já está Cadastrado!' } };
    }

    // 1.1 Verifica se já possui convite pendente
    const { data: existingInvite } = await supabase
      .from('invitations')
      .select('email')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingInvite) {
      return { data: null, error: { message: 'Este e-mail já possui um convite enviado!' } };
    }

    // 1.2 Verifica se atingiu o limite de usuários da instituição
    if (institutionId) {
      const { data: inst } = await supabase
        .from('institutions')
        .select('user_limit')
        .eq('id', institutionId)
        .single();
      
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('institution_id', institutionId);

      if (inst && count !== null && count >= inst.user_limit) {
        return { data: null, error: { message: `Limite de usuários (${inst.user_limit}) atingido para esta instituição.` } };
      }
    }

    // 2. Insere ou atualiza o convite (Upsert evita o erro 409 Conflict)
    const { data, error } = await supabase
      .from('invitations')
      .upsert([
        { 
          email: cleanEmail, 
          role: 'VOLUNTÁRIO',
          department_id: departmentId,
          institution_id: institutionId
        }
      ])
      .select();

    // 3. Dispara o envio de E-mail de convite via Edge Function
    let emailSent = false;
    let emailError = null;

    if (!error) {
      try {
        const { data: fData, error: fError } = await supabase.functions.invoke('invite-email', {
          body: {
            email: cleanEmail,
            name: name,
            inviteUrl: 'https://vollyconnect.com'
          }
        });

        if (fError) {
          console.error('Falha de Rede com a Edge Function:', fError);
          emailError = 'Falha de conexão com o servidor de e-mail.';
        } else if (fData && fData.success === false) {
          console.error('Resend processou, mas negou o envio:', fData.error, fData.details);
          emailError = fData.error;
        } else {
          console.log('E-mail enviado com sucesso!');
          emailSent = true;
        }
      } catch (err) {
        console.error('Falha crítica ao chamar Edge Function:', err);
        emailError = 'Erro interno ao processar e-mail.';
      }
    }

    return { data, error, emailSent, emailError };
  },

  /**
   * Lista todos os voluntários cadastrados.
   */
  listVolunteers: async (institutionId?: string | null) => {
    let query = supabase
      .from('profiles')
      .select('*, user_departments(departments(name))');

    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    const mappedData = data?.map(p => ({
      id: p.id,
      email: p.email,
      role: p.access_level,
      name: p.full_name,
      created_at: p.created_at,
      institution_id: p.institution_id,
      teams: p.user_departments?.map((ud: any) => ud.departments?.name).filter(Boolean) || []
    })) as (Profile & { teams: string[] })[];

    return { data: mappedData, error };
  },

  /**
   * Remove um voluntário da base de acessos.
   */
  removeVolunteer: async (id: string) => {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    return { error };
  },

  /**
   * Altera o papel de um usuário (via RPC, apenas ADMIN).
   */
  updateVolunteerRole: async (userId: string, newRole: 'ADMIN' | 'LÍDER' | 'CO-LÍDER' | 'VOLUNTÁRIO') => {
    const { data, error } = await supabase.rpc('update_user_role', {
      p_user_id: userId,
      p_new_role: newRole
    });
    return { data, error };
  },

  /**
   * Cria um departamento novo (via RPC).
   */
  createDepartment: async (name: string, description: string = '', leaderId?: string, coLeaderId?: string, institutionId?: string | null) => {
    const { data, error } = await supabase
      .from('departments')
      .insert([
        { 
          name, 
          description, 
          leader_id: leaderId,
          co_leader_id: coLeaderId,
          institution_id: institutionId
        }
      ])
      .select();
    return { data, error };
  },

  /**
   * Altera o líder de um departamento (Apenas ADMIN).
   */
  updateDepartmentLeader: async (deptId: string, leaderId: string) => {
    const { data, error } = await supabase
      .from('departments')
      .update({ leader_id: leaderId })
      .eq('id', deptId)
      .select();
    return { data, error };
  },

  /**
   * Altera o co-líder de um departamento (Apenas ADMIN).
   */
  updateDepartmentCoLeader: async (deptId: string, coLeaderId: string | null) => {
    const { data, error } = await supabase
      .from('departments')
      .update({ co_leader_id: coLeaderId })
      .eq('id', deptId)
      .select();
    return { data, error };
  },

  /**
   * Lista os departamentos, incluindo o nome do líder.
   */
  listDepartments: async (institutionId?: string | null) => {
    let query = supabase
      .from('departments')
      .select('*, leader:profiles!leader_id(full_name), co_leader:profiles!co_leader_id(full_name)');

    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }

    const { data, error } = await query.order('name');
    return { data, error };
  },

  /**
   * Gerencia o vínculo de um usuário a um departamento (Ação de ADMIN ou LÍDER).
   */
  manageUserDepartment: async (userId: string, deptId: string, action: 'ADD' | 'REMOVE') => {
    const { data, error } = await supabase.rpc('manage_user_department', {
      p_user_id: userId,
      p_dept_id: deptId,
      p_action: action
    });
    return { data, error };
  },

  /**
   * Busca os departamentos que um usuário específico lidera.
   */
  getLeaderDepartments: async (userId: string) => {
    const { data, error } = await supabase
      .from('departments')
      .select('id, name')
      .or(`leader_id.eq.${userId},co_leader_id.eq.${userId}`);
    return { data, error };
  },

  /**
   * Busca todos os departamentos aos quais um usuário pertence.
   */
  getUserDepartments: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_departments')
      .select('department_id, departments(id, name)')
      .eq('user_id', userId);
    return { data, error: error };
  },
  
  /**
   * Lista todas as funções (Roles) separadas por departamento.
   */
  listAllRoles: async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('*, departments(name)')
      .order('name');
    return { data, error };
  },

  /**
   * Cria uma nova função atrelada a um departamento (RPC).
   */
  createDepartmentRole: async (deptId: string, name: string) => {
    const { data, error } = await supabase.rpc('create_department_role', {
      p_dept_id: deptId,
      p_name: name
    });
    return { data, error };
  },

  /**
   * Pega os IDs de todas as funções atreladas a um usuário.
   */
  getUserRoles: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId);
    return { data, error };
  },

  /**
   * Liga ou desliga (toggles) uma função num usuário específico (RPC).
   */
  toggleUserRole: async (userId: string, roleId: string, action: 'ADD' | 'REMOVE') => {
    const { data, error } = await supabase.rpc('toggle_user_role', {
      p_user_id: userId,
      p_role_id: roleId,
      p_action: action
    });
    return { data, error };
  },

  /**
   * Exclui um departamento (Apenas ADMIN).
   */
  deleteDepartment: async (deptId: string) => {
    const { data, error } = await supabase.rpc('delete_department', {
      p_dept_id: deptId
    });
    return { data, error };
  },

  /**
   * Atualiza nome e descrição de um departamento (Apenas ADMIN).
   */
  updateDepartment: async (deptId: string, name: string, description: string = '') => {
    const { data, error } = await supabase.rpc('update_department', {
      p_dept_id: deptId,
      p_name: name,
      p_desc: description
    });
    return { data, error };
  },

  /**
   * Assina canais de tempo real para todas as tabelas relacionadas à gestão.
   */
  subscribeToAdminChanges: (callback: () => void) => {
    const channel = supabase
      .channel('admin-realtime-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => callback())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invitations' }, () => callback())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, () => callback())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roles' }, () => callback())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_departments' }, () => callback())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => callback())
      .subscribe();
      
    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
      }
    };
  },

  /**
   * --- MÉTODOS EXCLUSIVOS MASTER ADMIN ---
   */

  /**
   * Lista todas as instituições com a contagem atual de usuários.
   */
  listInstitutions: async () => {
    try {
      const { data, error } = await supabase
        .from('institutions')
        .select(`
          *,
          profiles:profiles(count)
        `)
        .order('name');

      if (error) {
        console.error('[AdminService] listInstitutions Error:', error.message);
        return { data: null, error };
      }

      // Mapeia para incluir o total de usuários ativos
      const mapped = data?.map(inst => ({
        ...inst,
        userCount: inst.profiles?.[0]?.count || 0
      })) as Institution[];

      return { data: mapped, error: null };
    } catch (err: any) {
      console.error('[AdminService] listInstitutions Critical Error:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Cria uma nova instituição.
   */
  createInstitution: async (name: string, slug: string, userLimit: number = 30, logoUrl?: string | null, adminEmail?: string | null) => {
    // 1. Cria a Instituição
    const { data: inst, error: instError } = await supabase
      .from('institutions')
      .insert([{ name, slug, user_limit: userLimit, logo_url: logoUrl || null }])
      .select()
      .single();

    if (instError) return { data: null, error: instError };

    // 2. Se houver e-mail de admin, cria o convite automático
    if (adminEmail && inst) {
      const { error: inviteError } = await supabase
        .from('invitations')
        .insert([{
          email: adminEmail.toLowerCase().trim(),
          role: 'ADMIN',
          institution_id: inst.id
        }]);
      
      if (inviteError) {
        console.error('Falha ao criar convite de administrador inicial:', inviteError);
        // Não barramos a criação da instituição se o convite falhar, mas logamos.
      }
    }

    return { data: inst, error: null };
  },

  /**
   * Atualiza dados de uma instituição.
   */
  updateInstitution: async (id: string, updates: any) => {
    return await supabase
       .from('institutions')
       .update(updates)
       .eq('id', id)
       .select()
       .single();
  },

  /**
   * Upload de logo da instituição.
   */
  uploadInstitutionLogo: async (base64Data: string) => {
    try {
      const { decode } = require('base64-arraybuffer');
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `logos/${fileName}`;

      const { data, error } = await supabase.storage
        .from('branding')
        .upload(filePath, decode(base64Data), {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(data.path);

      return { publicUrl, error: null };
    } catch (error) {
      console.error('Logo upload error:', error);
      return { publicUrl: null, error };
    }
  },
  /**
   * Lista todos os administradores de uma instituição específica.
   */
  listInstitutionAdmins: async (institutionId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('access_level', 'ADMIN')
      .order('full_name');
    
    return { data, error };
  }
};
