-- SCRIPT PARA PERMITIR QUE CO-LÍDERES (E LÍDERES/ADMINS) VEJAM A DISPONIBILIDADE DA EQUIPE

-- 1. Removemos a política antiga se existir (apenas para garantir que não haja conflitos, ou podemos apenas adicionar uma nova de leitura)
DROP POLICY IF EXISTS "Líderes podem ver disponibilidade da equipe" ON public.user_event_availabilities;
DROP POLICY IF EXISTS "Gestores podem ver disponibilidade" ON public.user_event_availabilities;

-- 2. Criamos uma política de leitura (SELECT) abrangente para quem tem cargo de gestão
CREATE POLICY "Gestores podem ver disponibilidade" 
ON public.user_event_availabilities 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
      AND p.access_level IN ('MASTER', 'ADMIN', 'LÍDER', 'CO-LÍDER')
  )
);

-- Garantimos que a tabela tem RLS ativado
ALTER TABLE public.user_event_availabilities ENABLE ROW LEVEL SECURITY;
