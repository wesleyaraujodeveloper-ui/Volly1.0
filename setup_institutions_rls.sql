-- Correção de Permissões (RLS) para a tabela de Instituições
-- Rodar no SQL Editor do Supabase

-- 1. Remove qualquer política anterior conflitante
DROP POLICY IF EXISTS "Mestres gerenciam instituições" ON public.institutions;

-- 2. Cria a nova política garantindo que o perfil MASTER tem controle total (Insert/Update/Delete) sobre as instituições
CREATE POLICY "Mestres gerenciam instituições" 
ON public.institutions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE public.profiles.id = auth.uid() 
    AND public.profiles.access_level = 'MASTER'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE public.profiles.id = auth.uid() 
    AND public.profiles.access_level = 'MASTER'
  )
);
