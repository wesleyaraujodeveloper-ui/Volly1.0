-- Adiciona a coluna can_export_holyrics na tabela departments
ALTER TABLE departments ADD COLUMN IF NOT EXISTS can_export_holyrics BOOLEAN DEFAULT FALSE;

-- Atualiza o cache do schema do PostgREST para reconhecer a nova coluna imediatamente
NOTIFY pgrst, 'reload schema';
