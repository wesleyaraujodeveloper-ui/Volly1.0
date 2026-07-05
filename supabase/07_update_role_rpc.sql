-- RPC: Atualizar função atrelada ao departamento
CREATE OR REPLACE FUNCTION update_department_role(p_role_id UUID, p_name TEXT, p_icon_name TEXT DEFAULT NULL)
RETURNS public.roles AS $$
DECLARE
    v_admin_count INT;
    v_updated_role public.roles;
BEGIN
    SELECT COUNT(*) INTO v_admin_count FROM public.profiles 
    WHERE id = auth.uid() AND access_level IN ('MASTER', 'ADMIN', 'LÍDER', 'CO-LÍDER');

    IF v_admin_count = 0 THEN
        RAISE EXCEPTION 'Acesso negado. Apenas MASTER, ADMINS, LÍDERES e CO-LÍDERES podem editar funções departamentais.';
    END IF;

    UPDATE public.roles 
    SET name = p_name, icon_name = p_icon_name
    WHERE id = p_role_id
    RETURNING * INTO v_updated_role;

    RETURN v_updated_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
