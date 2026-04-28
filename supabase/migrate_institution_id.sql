-- SCRIPT DE MIGRAÇÃO: VINCULAR DADOS EXISTENTES A UMA INSTITUIÇÃO
-- Este script garante que todos os dados antigos (sem institution_id) sejam vinculados a uma instituição padrão.
-- Útil para a transição para o modelo Multi-Tenant (SaaS).

DO $$
DECLARE
    v_default_inst_id UUID;
    v_master_email TEXT := 'wesleyaraujo.developer@gmail.com'; -- Email do MASTER (não será alterado)
BEGIN
    -- 1. Tentar encontrar uma instituição existente
    SELECT id INTO v_default_inst_id FROM public.institutions ORDER BY created_at ASC LIMIT 1;

    -- 2. Se não existir nenhuma instituição, cria uma "Instituição Padrão"
    IF v_default_inst_id IS NULL THEN
        INSERT INTO public.institutions (name, slug, user_limit, active)
        VALUES ('Instituição Principal', 'principal', 100, true)
        RETURNING id INTO v_default_inst_id;
        
        RAISE NOTICE 'Criada nova Instituição Padrão com ID: %', v_default_inst_id;
    ELSE
        RAISE NOTICE 'Usando Instituição existente com ID: %', v_default_inst_id;
    END IF;

    -- 3. Atualizar Tabela: PROFILES
    -- Atualiza todos os perfis que não têm instituição e que não são o MASTER ADMIN
    UPDATE public.profiles 
    SET institution_id = v_default_inst_id 
    WHERE institution_id IS NULL 
      AND access_level != 'MASTER'
      AND email != v_default_inst_id::text; -- sanity check
      
    RAISE NOTICE 'Tabela PROFILES atualizada.';

    -- 4. Atualizar Tabela: DEPARTMENTS
    UPDATE public.departments 
    SET institution_id = v_default_inst_id 
    WHERE institution_id IS NULL;
    
    RAISE NOTICE 'Tabela DEPARTMENTS atualizada.';

    -- 5. Atualizar Tabela: EVENTS
    UPDATE public.events 
    SET institution_id = v_default_inst_id 
    WHERE institution_id IS NULL;
    
    RAISE NOTICE 'Tabela EVENTS atualizada.';

    -- 6. Atualizar Tabela: INVITATIONS
    UPDATE public.invitations 
    SET institution_id = v_default_inst_id 
    WHERE institution_id IS NULL;
    
    RAISE NOTICE 'Tabela INVITATIONS atualizada.';

    -- 7. Atualizar Tabela: POSTS (Mural Social)
    -- Verifica se a coluna existe antes de atualizar para evitar erros caso a tabela não exista ou não tenha a coluna
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='posts' AND column_name='institution_id') THEN
        EXECUTE 'UPDATE public.posts SET institution_id = $1 WHERE institution_id IS NULL' USING v_default_inst_id;
        RAISE NOTICE 'Tabela POSTS atualizada.';
    END IF;

    RAISE NOTICE 'Migração de institution_id concluída com sucesso!';
END $$;
