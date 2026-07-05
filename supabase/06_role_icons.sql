-- Adiciona a coluna icon_name na tabela roles
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS icon_name TEXT;

-- Atualiza a RPC para suportar o novo campo
CREATE OR REPLACE FUNCTION create_department_role(p_dept_id UUID, p_name TEXT, p_icon_name TEXT DEFAULT NULL)
RETURNS public.roles AS $$
DECLARE
    v_admin_count INT;
    v_new_role public.roles;
BEGIN
    SELECT COUNT(*) INTO v_admin_count FROM public.profiles 
    WHERE id = auth.uid() AND access_level IN ('MASTER', 'ADMIN', 'LÍDER', 'CO-LÍDER');

    IF v_admin_count = 0 THEN
        RAISE EXCEPTION 'Acesso negado. Apenas MASTER, ADMINS, LÍDERES e CO-LÍDERES podem criar funções departamentais.';
    END IF;

    INSERT INTO public.roles (name, department_id, icon_name) 
    VALUES (p_name, p_dept_id, p_icon_name)
    RETURNING * INTO v_new_role;

    RETURN v_new_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
