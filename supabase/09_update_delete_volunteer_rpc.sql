CREATE OR REPLACE FUNCTION delete_volunteer(p_user_id UUID)
RETURNS BOOLEAN AS $$$
DECLARE
    v_target_institution UUID;
    v_target_email TEXT;
    v_caller_institution UUID;
    v_caller_access_level TEXT;
BEGIN
    -- Busca os dados do administrador que está tentando excluir
    SELECT institution_id, access_level 
    INTO v_caller_institution, v_caller_access_level 
    FROM public.profiles 
    WHERE id = auth.uid() AND access_level IN ('MASTER', 'ADMIN');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Acesso negado. Apenas ADMINS e MASTER podem excluir voluntários.';
    END IF;

    -- Busca a instituição e o e-mail do usuário que será excluído
    SELECT institution_id, email INTO v_target_institution, v_target_email 
    FROM public.profiles 
    WHERE id = p_user_id;
    
    -- Verifica se são da mesma instituição, exceto se for MASTER
    IF v_target_institution IS DISTINCT FROM v_caller_institution AND v_caller_access_level != 'MASTER' THEN
        RAISE EXCEPTION 'Acesso negado. Você só pode excluir voluntários da sua instituição.';
    END IF;

    -- Deleta o convite associado ao e-mail (Evita que a pessoa crie a conta novamente com o mesmo acesso)
    IF v_target_email IS NOT NULL THEN
        DELETE FROM public.invitations WHERE LOWER(email) = LOWER(v_target_email);
    END IF;

    -- Deleta o usuário da auth.users (isso vai disparar o CASCADE para public.profiles)
    DELETE FROM auth.users WHERE id = p_user_id;

    RETURN FOUND;
END;
$$$ LANGUAGE plpgsql SECURITY DEFINER;
