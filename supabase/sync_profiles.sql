-- SCRIPT DE SINCRONIZAÇÃO VOLY
-- Este script resolve o problema de usuários convidados que criaram conta mas não tiveram seu perfil gerado.

-- 1. SINCRONIZAR PERFIS (PROFILES)
-- Cria o registro na tabela profiles para quem está no auth.users e possui convite, mas não tem perfil.
INSERT INTO public.profiles (id, email, full_name, access_level)
SELECT 
    au.id, 
    au.email, 
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', 'Voluntário'),
    COALESCE(i.role::user_access_level, 'VOLUNTÁRIO')
FROM auth.users au
JOIN public.invitations i ON au.email = i.email
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 2. SINCRONIZAR EQUIPES (USER_DEPARTMENTS)
-- Vincula os usuários às equipes definidas no momento do convite original.
INSERT INTO public.user_departments (user_id, department_id)
SELECT 
    au.id, 
    i.department_id
FROM auth.users au
JOIN public.invitations i ON au.email = i.email
JOIN public.profiles p ON au.id = p.id
LEFT JOIN public.user_departments ud ON (ud.user_id = au.id AND ud.department_id = i.department_id)
WHERE i.department_id IS NOT NULL AND ud.user_id IS NULL
ON CONFLICT DO NOTHING;
