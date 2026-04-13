import { supabase } from './supabase';

export interface Profile {
  id?: string;
  email: string;
  role: 'ADMIN' | 'LÍDER' | 'VOLUNTÁRIO';
  name?: string;
  created_at?: string;
  teams?: string[];
}

export const adminService = {
  /**
   * Registra um novo voluntário na tabela de convites (invitations).
   */
  inviteVolunteer: async (email: string, name: string = '', departmentId?: string | null) => {
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

    // 2. Insere ou atualiza o convite (Upsert evita o erro 409 Conflict)
    const { data, error } = await supabase
      .from('invitations')
      .upsert([
        { 
          email: cleanEmail, 
          role: 'VOLUNTÁRIO',
          department_id: departmentId
        }
      ])
      .select();

    // 3. Dispara o envio de E-mail de convite via Edge Function
    if (!error) {
       // Não usamos o await aqui para não travar a UI enquanto o e-mail não "termina" de enviar. 
       supabase.functions.invoke('invite-email', {
         body: {
           email: cleanEmail,
           name: name,
           inviteUrl: 'https://volly-app-nu.vercel.app'
          }
        }).then(res => {
          if (res.error) {
            console.error('Falha de Rede com a Edge Function:', res.error);
          } else if (res.data && res.data.success === false) {
            console.error('Resend processou, mas negou o envio. Erro da API:', res.data.error, res.data.details);
          } else {
            console.log('E-mail enviado com sucesso! Resposta do Resend:', res.data);
          }
        }).catch(err => {
          console.error('Falha crítica ao chamar Edge Function:', err);
        });
     }

    return { data, error };
  },

  /**
   * Lista todos os voluntários cadastrados.
   */
  listVolunteers: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, user_departments(departments(name))')
      .order('created_at', { ascending: false });

    const mappedData = data?.map(p => ({
      id: p.id,
      email: p.email,
      role: p.access_level,
      name: p.full_name,
      created_at: p.created_at,
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
  updateVolunteerRole: async (userId: string, newRole: 'ADMIN' | 'LÍDER' | 'VOLUNTÁRIO') => {
    const { data, error } = await supabase.rpc('update_user_role', {
      p_user_id: userId,
      p_new_role: newRole
    });
    return { data, error };
  },

  /**
   * Cria um departamento novo (via RPC).
   */
  createDepartment: async (name: string, description: string = '', leaderId?: string) => {
    const { data, error } = await supabase.rpc('create_department', {
      p_name: name,
      p_desc: description,
      p_leader_id: leaderId
    });
    return { data, error };
  },

  /**
   * Altera o líder de um departamento (Apenas ADMIN).
   */
  updateDepartmentLeader: async (deptId: string, leaderId: string) => {
    const { data, error } = await supabase.rpc('update_department_leader', {
      p_dept_id: deptId,
      p_leader_id: leaderId
    });
    return { data, error };
  },

  /**
   * Lista os departamentos, incluindo o nome do líder.
   */
  listDepartments: async () => {
    const { data, error } = await supabase
      .from('departments')
      .select('*, leader:profiles!leader_id(full_name)')
      .order('name');
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
      .eq('leader_id', userId);
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
  }
};
