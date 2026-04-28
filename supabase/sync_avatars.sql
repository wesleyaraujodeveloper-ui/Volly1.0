-- SCRIPT PARA SINCRONIZAR AVATARES DO GOOGLE
-- Este script copia a URL da foto de perfil (avatar) do Google que fica salva na tabela oculta "auth.users" 
-- e atualiza a tabela "public.profiles" para os usuários que estão com a foto em branco.

UPDATE public.profiles p
SET avatar_url = COALESCE(
    u.raw_user_meta_data->>'avatar_url', 
    u.raw_user_meta_data->>'picture'
)
FROM auth.users u
WHERE p.id = u.id 
  AND (p.avatar_url IS NULL OR p.avatar_url = '')
  AND (u.raw_user_meta_data->>'avatar_url' IS NOT NULL OR u.raw_user_meta_data->>'picture' IS NOT NULL);

-- Opcional: Se quiser forçar a atualização de TODOS os avatares (mesmo os que já têm imagem, para garantir que estão com a foto mais recente do Google), 
-- você pode rodar o comando abaixo (remova os traços '--' do início para ativar):

-- UPDATE public.profiles p
-- SET avatar_url = COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
-- FROM auth.users u
-- WHERE p.id = u.id AND (u.raw_user_meta_data->>'avatar_url' IS NOT NULL OR u.raw_user_meta_data->>'picture' IS NOT NULL);
