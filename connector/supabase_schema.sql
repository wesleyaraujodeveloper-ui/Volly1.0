-- Execute este script no SQL Editor do seu Supabase Dashboard

CREATE TABLE IF NOT EXISTS public.holyrics_exports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_code text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'timed_out'
  message text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Permite que o PWA insira dados livremente
-- ATENÇÃO: Num app real com autenticação forte, vocë colocaria políticas RLS restritivas.
-- Para o cenário de testes, vamos permitir Insert/Update/Select anonimamente (se o RLS estiver ativo).
ALTER TABLE public.holyrics_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts" ON public.holyrics_exports
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous selects" ON public.holyrics_exports
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous updates" ON public.holyrics_exports
  FOR UPDATE USING (true);
