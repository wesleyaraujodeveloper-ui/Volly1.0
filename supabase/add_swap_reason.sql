-- Adiciona a coluna swap_reason na tabela schedules
ALTER TABLE public.schedules 
ADD COLUMN IF NOT EXISTS swap_reason TEXT;
