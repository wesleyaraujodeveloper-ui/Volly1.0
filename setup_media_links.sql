-- Adiciona a coluna media_links na tabela events como JSONB para armazenar uma lista de URLs
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS media_links JSONB DEFAULT '[]'::jsonb;

-- Opcional: Para eventos existentes onde os links estão nulos, podemos inicializar como array vazio se necessário
UPDATE public.events SET media_links = '[]'::jsonb WHERE media_links IS NULL;
