import { supabase } from './supabase';

export interface Profile {
  id?: string;
  email: string;
  role: 'ADMIN' | 'LÍDER' | 'VOLUNTÁRIO';
  name?: string;
  created_at?: string;
}

export const adminService = {
  /**
   * Registra um novo voluntário na tabela de convites (invitations).
   */
  inviteVolunteer: async (email: string, name: string = '') => {
    const cleanEmail = email.toLowerCase().trim();

    // 1. Verifica se já não é um membro ativo
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .single();

    if (existingProfile) {
      return { data: null, error: { message: 'Este voluntário já é um membro ativo.' } };
    }

    // 2. Insere ou atualiza o convite (Upsert evita o erro 409 Conflict)
    const { data, error } = await supabase
      .from('invitations')
      .upsert([
        { 
          email: cleanEmail, 
          role: 'VOLUNTÁRIO'
        }
      ])
      .select();

    return { data, error };
  },

  /**
   * Lista todos os voluntários cadastrados.
   */
  listVolunteers: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('access_level', 'VOLUNTÁRIO')
      .order('created_at', { ascending: false });

    // Mapeia os dados para o formato da interface Profile
    const mappedData = data?.map(p => ({
      id: p.id,
      email: p.email,
      role: p.access_level, // Mapeia access_level para role
      name: p.full_name,    // Mapeia full_name para name
      created_at: p.created_at
    })) as Profile[];

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
  }
};
