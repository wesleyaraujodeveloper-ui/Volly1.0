-- SCRIPT PARA PERMITIR QUE TODOS OS VOLUNTÁRIOS VEJAM A DISPONIBILIDADE DA EQUIPE

-- 1. Removemos as políticas antigas (para limpar e evitar sobreposição)
DROP POLICY IF EXISTS "Usuários gerenciam própria disponibilidade por evento" ON public.user_event_availabilities;
DROP POLICY IF EXISTS "Líderes podem ver disponibilidade da equipe" ON public.user_event_availabilities;
DROP POLICY IF EXISTS "Gestores podem ver disponibilidade" ON public.user_event_availabilities;

-- 2. Criamos uma política de leitura (SELECT) global para todos os usuários autenticados
CREATE POLICY "Leitura global de disponibilidade" 
ON public.user_event_availabilities 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 3. Recriamos as políticas de inserção, atualização e exclusão apenas para o dono do registro
CREATE POLICY "Usuários podem inserir sua própria disponibilidade" 
ON public.user_event_availabilities 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar sua própria disponibilidade" 
ON public.user_event_availabilities 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar sua própria disponibilidade" 
ON public.user_event_availabilities 
FOR DELETE 
USING (auth.uid() = user_id);

-- Garantimos que a tabela tem RLS ativado
ALTER TABLE public.user_event_availabilities ENABLE ROW LEVEL SECURITY;
