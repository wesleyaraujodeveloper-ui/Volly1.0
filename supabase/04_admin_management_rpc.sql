-- RPC para promover um usuário a ADMIN e vinculá-lo a uma instituição
CREATE OR REPLACE FUNCTION promote_user_to_admin_with_institution(p_user_id UUID, p_institution_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_admin_count INT;
BEGIN
    -- Verifica se quem chama é ADMIN ou MASTER
    SELECT COUNT(*) INTO v_admin_count FROM public.profiles 
    WHERE id = auth.uid() AND access_level IN ('MASTER', 'ADMIN');

    IF v_admin_count = 0 THEN
        RAISE EXCEPTION 'Acesso negado. Apenas ADMINS e MASTER podem promover usuários.';
    END IF;

    UPDATE public.profiles 
    SET access_level = 'ADMIN', institution_id = p_institution_id
    WHERE id = p_user_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para rebaixar um admin de volta a voluntário
CREATE OR REPLACE FUNCTION demote_admin_to_volunteer(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_admin_count INT;
BEGIN
    -- Verifica se quem chama é ADMIN ou MASTER
    SELECT COUNT(*) INTO v_admin_count FROM public.profiles 
    WHERE id = auth.uid() AND access_level IN ('MASTER', 'ADMIN');

    IF v_admin_count = 0 THEN
        RAISE EXCEPTION 'Acesso negado. Apenas ADMINS e MASTER podem alterar restrições de cargo.';
    END IF;

    -- Prevenção para não deixar o sistema sem nenhum ADMIN caso ele esteja demitindo a si mesmo
    IF p_user_id = auth.uid() THEN
        SELECT COUNT(*) INTO v_admin_count FROM public.profiles WHERE access_level IN ('MASTER', 'ADMIN');
        IF v_admin_count <= 1 THEN
            RAISE EXCEPTION 'Não é possível remover o único administrador restante do sistema.';
        END IF;
    END IF;

    UPDATE public.profiles 
    SET access_level = 'VOLUNTÁRIO'
    WHERE id = p_user_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para excluir um voluntário completamente (Admin e Master)
CREATE OR REPLACE FUNCTION delete_volunteer(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_admin_count INT;
    v_target_institution UUID;
    v_caller_institution UUID;
BEGIN
    SELECT COUNT(*), MAX(institution_id) INTO v_admin_count, v_caller_institution 
    FROM public.profiles 
    WHERE id = auth.uid() AND access_level IN ('MASTER', 'ADMIN');

    IF v_admin_count = 0 THEN
        RAISE EXCEPTION 'Acesso negado. Apenas ADMINS e MASTER podem excluir voluntários.';
    END IF;

    SELECT institution_id INTO v_target_institution FROM public.profiles WHERE id = p_user_id;
    
    IF v_target_institution != v_caller_institution AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND access_level = 'MASTER') THEN
        RAISE EXCEPTION 'Acesso negado. Você só pode excluir voluntários da sua instituição.';
    END IF;

    -- Deleta o usuário da auth.users (isso vai disparar o CASCADE para public.profiles)
    DELETE FROM auth.users WHERE id = p_user_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
