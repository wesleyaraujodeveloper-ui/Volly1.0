-- Adiciona a coluna tonalidade à tabela event_songs
ALTER TABLE public.event_songs
ADD COLUMN IF NOT EXISTS tonalidade TEXT;
