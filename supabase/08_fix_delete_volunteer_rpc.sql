CREATE OR REPLACE FUNCTION delete_volunteer(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_target_institution UUID;
    v_caller_institution UUID;
    v_caller_access_level TEXT;
BEGIN
    -- Busca os dados do administrador que est tentando excluir
    SELECT institution_id, access_level 
    INTO v_caller_institution, v_caller_access_level 
    FROM public.profiles 
    WHERE id = auth.uid() AND access_level IN ('MASTER', 'ADMIN');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Acesso negado. Apenas ADMINS e MASTER podem excluir voluntrios.';
    END IF;

    -- Busca a instituio do usurio que ser excludo
    SELECT institution_id INTO v_target_institution 
    FROM public.profiles 
    WHERE id = p_user_id;
    
    -- Verifica se so da mesma instituio, exceto se for MASTER
    IF v_target_institution IS DISTINCT FROM v_caller_institution AND v_caller_access_level != 'MASTER' THEN
        RAISE EXCEPTION 'Acesso negado. Voc s pode excluir voluntrios da sua instituio.';
    END IF;

    -- Deleta o usurio da auth.users (isso vai disparar o CASCADE para public.profiles)
    DELETE FROM auth.users WHERE id = p_user_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
